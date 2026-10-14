from pathlib import Path
from uuid import uuid4

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
)

from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma


# ==================================================
# DIRECTORY CONFIGURATION
# ==================================================

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "uploads"
VECTORSTORE_DIR = BASE_DIR / "vectorstore"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)


# ==================================================
# EMBEDDING MODEL
# ==================================================

embeddings = OllamaEmbeddings(
    model="nomic-embed-text",
    base_url="http://localhost:11434",
)


# ==================================================
# CHROMADB VECTOR STORE
# ==================================================

vectorstore = Chroma(
    collection_name="documind_documents",
    embedding_function=embeddings,
    persist_directory=str(VECTORSTORE_DIR),
)


# ==================================================
# TEXT SPLITTER
# ==================================================

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
)


# ==================================================
# DOCUMENT PROCESSING
# ==================================================

def process_document(
    file_path: Path,
    document_id: str,
    original_filename: str | None = None,
):
    """
    Extract text, split it into chunks, generate embeddings,
    and save the chunks in ChromaDB.
    """

    extension = file_path.suffix.lower()

    # --------------------------------------------------
    # STEP 1: LOAD DOCUMENT
    # --------------------------------------------------

    if extension == ".pdf":
        loader = PyPDFLoader(str(file_path))

    elif extension == ".txt":
        loader = TextLoader(
            str(file_path),
            encoding="utf-8",
        )

    elif extension == ".docx":
        loader = Docx2txtLoader(str(file_path))

    else:
        raise ValueError(
            "Unsupported document format. "
            "Use PDF, TXT, or DOCX."
        )

    documents = loader.load()

    if not documents:
        raise ValueError(
            "No readable content was found in the document."
        )

    # --------------------------------------------------
    # STEP 2: ATTACH METADATA
    # --------------------------------------------------

    display_filename = original_filename or file_path.name

    for document in documents:
        document.metadata["document_id"] = document_id
        document.metadata["filename"] = file_path.name
        document.metadata["original_filename"] = display_filename

    # --------------------------------------------------
    # STEP 3: SPLIT TEXT INTO CHUNKS
    # --------------------------------------------------

    chunks = text_splitter.split_documents(documents)

    if not chunks:
        raise ValueError(
            "No readable text was found to create document chunks."
        )

    # --------------------------------------------------
    # STEP 4: GENERATE UNIQUE IDS
    # --------------------------------------------------

    chunk_ids = [
        str(uuid4())
        for _ in chunks
    ]

    # --------------------------------------------------
    # STEP 5: STORE CHUNKS AND EMBEDDINGS
    # --------------------------------------------------

    vectorstore.add_documents(
        documents=chunks,
        ids=chunk_ids,
    )

    # --------------------------------------------------
    # STEP 6: RETURN DOCUMENT INFORMATION
    # --------------------------------------------------

    return {
        "document_id": document_id,
        "filename": file_path.name,
        "original_filename": display_filename,
        "pages": len(documents),
        "chunks": len(chunks),
    }


# ==================================================
# DOCUMENT SEARCH
# ==================================================

def search_documents(
    question: str,
    k: int = 4,
    document_id: str | None = None,
):
    """
    Search ChromaDB for document chunks relevant to a question.

    If document_id is supplied, search only that document.
    Otherwise, search across all uploaded documents.
    """

    if not question.strip():
        return []

    if k < 1:
        raise ValueError("k must be at least 1.")

    search_filter = None

    if document_id:
        search_filter = {
            "document_id": document_id,
        }

    return vectorstore.similarity_search(
        query=question,
        k=k,
        filter=search_filter,
    )


# ==================================================
# DELETE DOCUMENT VECTORS
# ==================================================

def delete_document_vectors(document_id: str):
    """
    Delete all ChromaDB chunks associated with a document.
    """

    vectorstore.delete(
        where={
            "document_id": document_id,
        }
    )


def find_document_id_by_original_filename(
    original_filename: str,
) -> str | None:
    """
    Resolve an uploaded display filename to its indexed document ID.
    """

    result = vectorstore.get(
        where={
            "original_filename": original_filename,
        },
        include=["metadatas"],
    )

    for metadata in result.get("metadatas") or []:
        if metadata and metadata.get("document_id"):
            return str(metadata["document_id"])

    return None