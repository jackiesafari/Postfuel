import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import pytesseract
from pdf2image import convert_from_path
from langchain_core.documents import Document

from langchain_openai import ChatOpenAI
from langchain_classic.chains.summarize import load_summarize_chain
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

root_env = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=str(root_env))

app = FastAPI(title="Multi-Agent Content Studio - PDF Worker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
text_splitter = RecursiveCharacterTextSplitter(chunk_size=4000, chunk_overlap=200)


@app.post("/summarize")
async def summarize_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        loader = PyMuPDFLoader(tmp_path)
        raw_docs = loader.load()

        extracted_text = "\n".join(
            doc.page_content for doc in raw_docs if doc.page_content
        ).strip()

        method = "native"
        page_count = len(raw_docs)

        if len(extracted_text) < 100:
            print("PDF looks scanned or has very little text. Starting OCR...")

            images = convert_from_path(tmp_path)
            page_count = len(images)

            ocr_docs = []

            for i, image in enumerate(images):
                print(f"OCR-ing page {i + 1}...")
                page_text = pytesseract.image_to_string(image).strip()

                if page_text:
                    ocr_docs.append(
                        Document(
                            page_content=page_text,
                            metadata={"page": i + 1, "source": file.filename},
                        )
                    )

            if not ocr_docs:
                raise ValueError("OCR could not extract readable text from this PDF.")

            docs = text_splitter.split_documents(ocr_docs)
            method = "ocr"

        else:
            docs = text_splitter.split_documents(raw_docs)

        if not docs:
            raise ValueError("No text could be extracted from this document.")

        chain = load_summarize_chain(llm, chain_type="map_reduce")

        result = await chain.ainvoke({"input_documents": docs})
        summary_text = result.get("output_text", "")

        return {
            "summary": summary_text,
            "page_count": page_count,
            "chunk_count": len(docs),
            "status": "success",
            "method": method,
        }

    except Exception as e:
        print(f"Error processing PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/summarize-text")
async def summarize_text(data: dict):
    topic = data.get("topic", "General Topic")
    notes = data.get("sourceNotes", "")
    depth = data.get("depth", "standard")

    prompt = (
        f"Summarize the following topic: {topic}\n"
        f"Depth requested: {depth}\n"
        f"Context/Notes: {notes}\n"
        "Return the summary in clean Markdown."
    )

    try:
        response = await llm.ainvoke(prompt)
        return {"summary": response.content}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)