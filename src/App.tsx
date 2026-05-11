import PdfArchive from "./components/PdfArchive";
import { resumes } from "./data/resumes";

export default function App() {
  return <PdfArchive resumes={resumes} />;
}
