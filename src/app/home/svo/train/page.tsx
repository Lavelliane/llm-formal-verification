import FileUpload from "@/components/FileUpload";

export default function SvoPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <FileUpload type="svo_verification" />
    </div>
  );
}
