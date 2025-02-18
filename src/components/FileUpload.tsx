"use client";

import { useState, useEffect } from "react";
import { Button, Input } from "@heroui/react";

interface FileUploadProps {
  type: "svo_verification" | "ban_verification";
}

export default function FileUpload({ type }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (newFiles: FileList) => {
    setFiles(Array.from(newFiles));
  };

  async function handleSubmit() {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
      formData.append("type", type);
    });
    const response = await fetch("/api/v1/train", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    console.log(data);
  }

  return (
    <div className="file-upload flex flex-col gap-4">
      <Input type="file" onChange={(e) => e.target.files && handleFileChange(e.target.files)} />
      <div className="file-list">
        {files.map((file, index) => (
          <div key={index} className="file-item">
            {file.name}
          </div>
        ))}
      </div>
      <Button onPress={handleSubmit}>Add for Training</Button>
    </div>
  );
}
