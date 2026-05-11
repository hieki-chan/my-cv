import PdfArchive from "./components/PdfArchive.jsx";
import { resumes } from "./data/resumes.js";

export default function App() {
  return <PdfArchive resumes={resumes} />;
}
