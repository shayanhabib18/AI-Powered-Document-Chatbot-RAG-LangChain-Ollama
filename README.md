AI Document Chatbot

An AI-powered document question-answering application that helps users ask questions about their documents using **Retrieval-Augmented Generation (RAG)**. The project combines document processing, semantic search, vector storage, and a locally running language model to generate answers grounded in retrieved document content.

> **Project status:** In development. Features and setup steps may change as the frontend and backend are integrated.

## ✨ Features

- **Document loading:** Process PDF, TXT, and DOCX documents.
- **Text splitting:** Divide documents into smaller chunks for retrieval.
- **Semantic search:** Retrieve text chunks that are relevant to a user's question.
- **Vector storage:** Use ChromaDB to store and search document embeddings.
- **Local AI model:** Use Ollama to run a language model locally.
- **RAG workflow:** Provide retrieved document context to the model when generating answers.
- **React interface:** Build an interactive user interface with React.js and Tailwind CSS.

*Only consider a feature complete when it is implemented and working in your current version.*

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend user interface |
| Tailwind CSS | UI styling |
| Python | Document processing and AI backend |
| LangChain | Document pipeline and retrieval orchestration |
| ChromaDB | Vector storage and similarity search |
| Ollama | Running language models locally |
| PyPDF / PyPDFLoader | PDF loading |
| Docx2txt / Docx2txtLoader | DOCX loading |

## 🧠 How It Works

1. **Load documents** in supported formats.
2. **Extract text** from each document.
3. **Split the text** into smaller, overlapping chunks.
4. **Create embeddings** that represent the meaning of each chunk.
5. **Store embeddings** and their text in ChromaDB.
6. **Receive a question** from the user.
7. **Retrieve relevant chunks** through semantic similarity search.
8. **Generate an answer** with Ollama using the question and retrieved context.

This approach helps the model answer from the supplied documents rather than relying only on its general knowledge. Answers can still be inaccurate, so important information should be verified against the source documents.

## 🏗️ Project Structure

The exact structure may vary as the project develops. A possible layout is:

```text
ai-document-chatbot/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── App.jsx
│   └── package.json
├── backend/                  # Python application
│   ├── main.py
│   └── requirements.txt
├── .gitignore
└── README.md
```

Update this tree to match your actual repository. If your React app or Python files are stored in different directories, adjust the commands below accordingly.

## ⚙️ Prerequisites

Install or prepare the following:

- [Node.js and npm](https://nodejs.org/) for the React frontend
- [Python](https://www.python.org/) for the backend
- [Ollama](https://ollama.com/) for local model execution
- Git to clone the repository

## 🚀 Getting Started

### 1. Clone the repository

Replace the placeholder with your GitHub repository URL:

```bash
git clone https://github.com/YOUR_USERNAME/ai-document-chatbot.git
cd ai-document-chatbot
```

### 2. Set up the frontend

Navigate to the directory containing the frontend's `package.json`:

```bash
cd frontend
npm install
npm run dev
```

Vite will display the local development URL in the terminal. Open that URL in your browser.

> If `package.json` is in the repository root, run these commands from the root instead of `frontend/`.

### 3. Set up the Python backend

Open a second terminal and navigate to the directory containing your Python backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

Install the project's dependencies:

```bash
pip install -r requirements.txt
```

If you have not created `requirements.txt` yet, install the packages used by your current implementation. For example:

```bash
pip install langchain langchain-community langchain-text-splitters langchain-ollama langchain-chroma chromadb pypdf docx2txt
```

Save the installed dependencies once your environment is correct:

```bash
pip freeze > requirements.txt
```

Run the Python entry point appropriate to your project. For example, if `main.py` starts your application:

```bash
python main.py
```

If your backend uses FastAPI, Flask, or another framework, follow the run command configured for that application.

### 4. Set up Ollama

Install Ollama from the [official website](https://ollama.com/), then pull a model:

```bash
ollama pull llama3.2
```

Make sure the Ollama service is running. You can check available local models with:

```bash
ollama list
```

Use a model name that is installed locally and matches your backend configuration.

## 🔐 Configuration and Security

- Do not commit API keys, passwords, private documents, or `.env` files.
- Add `.env`, `.venv/`, `node_modules/`, generated vector-store data, and other local artifacts to `.gitignore` where appropriate.
- If you expose the application beyond your own machine, add appropriate authentication, upload validation, file-size limits, and access controls.
- Treat uploaded documents as potentially sensitive and avoid publishing them in the repository.

## 🗺️ Roadmap

- [ ] Finish document upload and management in the frontend.
- [ ] Connect the React frontend to the Python backend through an API.
- [ ] Complete document ingestion and vector indexing.
- [ ] Implement question answering using retrieved context and Ollama.
- [ ] Display source documents or excerpts with answers.
- [ ] Add conversation history.
- [ ] Improve error handling and loading states.
- [ ] Add tests and deployment instructions.

## 🧪 Troubleshooting

**Ollama connection error**
- Confirm Ollama is installed and running.
- Run `ollama list` to check that the configured model is available.
- Ensure the model name in your code matches the installed model.

**Python package errors**
- Activate the correct virtual environment.
- Install dependencies from `requirements.txt`.
- Confirm that you are using a Python version supported by your dependencies.

**Frontend does not start**
- Run `npm install` in the directory containing `package.json`.
- Check the terminal output for missing packages or port conflicts.

**No relevant document results**
- Confirm the documents were loaded and indexed successfully.
- Verify that the embedding model and vector-store configuration are correct.
- Check that the question is related to the indexed content.

## 🤝 Contributing

Suggestions and improvements are welcome. To contribute, fork the repository, create a feature branch, make your changes, and submit a pull request.

## 📄 License

Choose a license before distributing or accepting contributions. If you intend to use the MIT License, add a `LICENSE` file containing the appropriate license text.

## 👨‍💻 Author

**Shayan Habib**

- GitHub: [@shayanhabib18](https://github.com/shayanhabib18)

---

If you find this project useful, consider giving the repository a ⭐ on GitHub.

