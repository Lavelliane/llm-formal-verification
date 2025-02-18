import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { createClient } from "@/utils/supabase/server";

// Define the schema for verification steps with all step types
const VerificationStepSchema = z.object({
    id: z.string().regex(/^[AGHNPCD]\d+$/),
    type: z.enum([
        'assumption',    // A steps
        'goal',         // G steps
        'hypothesis',   // H steps
        'annotation',   // N steps
        'comprehension',// C steps
        'interpretation',// P steps
        'derivation'    // D steps
    ]),
    derivation: z.string(),
    reason: z.string(),
    rules: z.array(z.string()),
    dependencies: z.array(z.string()).optional() // Reference to previous steps used
});

export const VerificationOutputSchema = z.array(VerificationStepSchema);

// Create structured output parser
const parser = StructuredOutputParser.fromZodSchema(VerificationOutputSchema);

// Create prompt template with formal SVO notation, axioms, and all step types
const VERIFICATION_TEMPLATE = `
You are a protocol verification expert using Syverson-van Oorschot (SVO) logic.
Use the following formal notation and axioms to analyze the protocol diagram:

SVO NOTATION:
- P |≡ X : P believes X
- P ⊲ X : P has jurisdiction over X
- P ⊳ X : P receives X
- P |~ X : P previously sent X
- P |⇒ X : P has authority over X
- #(X) : X is fresh
- {X}K : X is encrypted with key K
- ⟨X⟩P : X is public key of P
- P ↔ K Q : K is a secret key shared between P and Q
- P ⟷ Q : Secret is shared between P and Q

SVO AXIOMS:
1. Belief Axioms (BAs):
   - P |≡ φ ∧ P |≡ (φ ⊃ ψ) → P |≡ ψ
   - P |≡ φ → φ

2. Source Association Axioms (SAAs):
   - (P ⊳ X ∧ P ⊳ {X}K) → Q |~ X
   - (P ←K→ Q ∧ P ⊳ {X}SK) → P |≡ Q |~ X

3. Receiving Axioms (RAs):
   - P ⊳ (X1,...,Xn) → P ⊳ Xi
   - (P ⊳ {X}K ∧ P ⊲ K) → P ⊳ X

4. Saying Axioms (SAs):
   - #(X1) → #(X1,...,Xn)
   - #(X1,...,Xn) → #({X1,...,Xn})

5. Jurisdiction Axiom (JR):
   - (P |≡ Q ⊲ X ∧ P |≡ Q |≡ X) → P |≡ X

6. Nonce Verification Axiom (NV):
   - (#(X) ∧ P |≡ Q |~ X) → P |≡ Q |≡ X

Generate verification steps in the following order:

1. Trust Assumptions (A steps):
   - Initial trust relationships
   - Key possession and distribution
   - Authority over specific claims

2. Goals (G steps):
   - Authentication goals
   - Secrecy goals
   - Agreement goals
   - Fresh belief establishment goals

3. Hypothesis (H steps):
   - Message reception events
   - Observable protocol actions

4. Annotations (N steps):
   - Protocol-specific notes
   - Clarification of assumptions
   - Context for interpretation

5. Comprehension (C steps):
   - Understanding of message components
   - Meaning of cryptographic operations
   - Relationship between messages

6. Interpretation (P steps):
   - Belief derivations from messages
   - Trust chain establishment
   - Protocol role understanding

7. Logical Derivations (D steps):
   - Application of SVO axioms
   - Proof of security properties
   - Achievement of stated goals

Analyze the following protocol diagram:
{mermaid_diagram}

{format_instructions}

For each step:
- Use precise SVO notation
- Cite specific axioms when used
- Reference previous steps that are used in the derivation
- Provide clear reasoning for each step
- Show how steps build toward protocol goals

Step-by-step verification:`;

// Initialize OpenAI model
const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.5,
    maxTokens: 10000,
});

export async function POST(request: NextRequest) {
    try {
        const { mermaidDiagram } = await request.json();
        const supabase = await createClient();

        if (!mermaidDiagram) {
            return NextResponse.json(
                { error: "No Mermaid diagram provided" },
                { status: 400 }
            );
        }
        // Create prompt from template
        const prompt = await PromptTemplate.fromTemplate(VERIFICATION_TEMPLATE).format({
            mermaid_diagram: mermaidDiagram,
            format_instructions: parser.getFormatInstructions(),
            X: "X",
            "X1,...,Xn": "X1,...,Xn"
        });

        // Get similar verification examples from vector store
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY!,
        });
        const queryEmbedding = await embeddings.embedQuery("Formal Verification using SVO Logic");
        console.log("Embedding generated:", {
            length: queryEmbedding.length,
            isArray: Array.isArray(queryEmbedding),
            sample: queryEmbedding.slice(0, 5)
        });
        const { data: examples, error: matchError } = await supabase.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_count: 10,
            filter: { },
            min_similarity: 0.0
        });

        console.log(examples);
        console.log(matchError);

        // Add examples to prompt if available
        const promptWithExamples = examples?.length
            ? `${prompt}\n\nSimilar verification examples:\n${examples.map((ex: { content: any; }) => ex.content).join('\n')}`
            : prompt;

        // Generate verification steps using LLM
        const response = await model.invoke(promptWithExamples);
        // Parse and validate the output
        const verificationSteps = await parser.parse(response.content as string);
        const validatedOutput = VerificationOutputSchema.parse(verificationSteps);

        return NextResponse.json(validatedOutput, { status: 200 });

    } catch (error) {
        console.error('Error in protocol verification:', error);
        return NextResponse.json(
            { error: "Failed to verify protocol" },
            { status: 500 }
        );
    }
}

export const config = {
    api: {
        bodyParser: true,
    },
};