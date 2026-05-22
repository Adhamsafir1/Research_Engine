import os
from typing import List, Optional, Dict

VECTOR_STORE = os.getenv("VECTOR_STORE", "qdrant").lower()
CHROMA_URL = os.getenv("CHROMA_URL", "http://localhost:8000")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", None)
VECTOR_DIM = int(os.getenv("VECTOR_DIM", "1536"))

class VectorDBClient:
    def __init__(self):
        if VECTOR_STORE == "qdrant":
            from qdrant_client import QdrantClient
            from qdrant_client.http.models import VectorParams, Distance

            self.store = "qdrant"
            self.client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None)
            self.vector_params = VectorParams(size=VECTOR_DIM, distance=Distance.COSINE)
        else:
            import chromadb

            self.store = "chroma"
            self.client = chromadb.HttpClient(
                host=CHROMA_URL.split("://")[-1].split(":")[0],
                port=int(CHROMA_URL.split(":")[-1]) if ":" in CHROMA_URL else 8000,
            )

    def get_or_create_collection(self, name: str):
        if self.store == "qdrant":
            existing = [c.name for c in self.client.get_collections().collections]
            if name not in existing:
                self.client.recreate_collection(
                    collection_name=name,
                    vectors_config=self.vector_params,
                )
            return name

        return self.client.get_or_create_collection(name=name)

    def add_documents(
        self,
        collection_name: str,
        docs: List[str],
        ids: List[str],
        metadatas: Optional[List[Dict]] = None,
        embeddings: Optional[List[List[float]]] = None,
    ):
        if self.store == "qdrant":
            if embeddings is None:
                raise ValueError("Qdrant requires embeddings for vector insertion.")

            points = []
            for idx, doc, embed in zip(ids, docs, embeddings):
                payload = {"text": doc}
                if metadatas:
                    payload["metadata"] = metadatas.pop(0)
                points.append({
                    "id": idx,
                    "vector": embed,
                    "payload": payload,
                })

            self.client.upsert(collection_name=collection_name, points=points)
            return

        collection = self.get_or_create_collection(collection_name)
        collection.add(
            documents=docs,
            ids=ids,
            metadatas=metadatas,
            embeddings=embeddings,
        )

    def search(
        self,
        collection_name: str,
        query_texts: List[str],
        n_results: int = 5,
        query_embeddings: Optional[List[List[float]]] = None,
    ):
        if self.store == "qdrant":
            if query_embeddings is None:
                raise ValueError("Qdrant requires query_embeddings for search.")

            return self.client.search(
                collection_name=collection_name,
                query_vector=query_embeddings[0],
                limit=n_results,
            )

        collection = self.get_or_create_collection(collection_name)
        return collection.query(
            query_texts=query_texts,
            n_results=n_results,
        )

vector_db = VectorDBClient()
