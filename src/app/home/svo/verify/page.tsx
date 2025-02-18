"use client";

import { useState } from "react";
import { VerificationOutputSchema } from "@/app/api/v1/verify/svo/route";

export default function VerifyPage() {
  const [mermaidDiagram, setMermaidDiagram] = useState("");
  const [verificationOutput, setVerificationOutput] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/v1/verify/svo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mermaidDiagram }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify protocol");
      }

      const data = await response.json();
      const parsedData = VerificationOutputSchema.parse(data);
      setVerificationOutput(parsedData as any);
      setError(null);
    } catch (err) {
      console.error(err);
      setVerificationOutput(null);
    }
  };

  return (
    <div className="flex flex-col items-start justify-start h-screen p-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-4">SVO Protocol Verification</h1>
      <textarea
        className="w-full h-40 p-2 border border-gray-700 rounded mb-4 bg-gray-800 text-white min-h-40"
        placeholder="Enter Mermaid diagram code here..."
        value={mermaidDiagram}
        onChange={(e) => setMermaidDiagram(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleSubmit}
      >
        Verify Protocol
      </button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {verificationOutput && (
        <div className="mt-4 w-full">
          <h2 className="text-xl font-bold mb-2">Verification Output</h2>
          <pre className="bg-gray-800 p-4 rounded text-white">
            {Array.isArray(verificationOutput as any) && (verificationOutput as any).map((step: any, index: number) => (
              <div key={index}>
                <p className="font-bold">{step.type}</p>
                <p>{step.reason}</p>
                <p>{`(${step.id})`} {step.derivation}</p>
                <p>By {step.rules.join(", ")}, {step.dependencies?.join(", ") || "None"}</p>
                <hr className="my-2" />
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}
