import { NextRequest, NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@/utils/supabase/server";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const formData = await request.formData();
    const file = formData.get("files") as File;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a Blob URL for the PDF
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const loader = new PDFLoader(blob);

    // Load and parse the PDF
    const docs = await loader.load();

    // Split the text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await textSplitter.splitDocuments(docs);

    // Process each chunk
    for (const chunk of chunks) {
      // Generate embedding
      const embedding = await embeddings.embedQuery(chunk.pageContent);

      // Store in Supabase
      const { error } = await supabase
        .from('documents')
        .insert({
          content: chunk.pageContent,
          type: type,
          metadata: {
            filename: file.name,
            pageNumber: chunk.metadata.pageNumber,
            ...chunk.metadata,
          },
          embedding
        });

      if (error) {
        console.error('Error inserting document:', error);
        return NextResponse.json(
          { error: "Failed to store document" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { 
        message: "Document processed successfully",
        chunks: chunks.length
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};