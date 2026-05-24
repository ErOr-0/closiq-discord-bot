import { FormEvent, useCallback, useEffect, useState } from "react";

import { type ApiEnvelope, apiDelete, apiGet, apiPost, apiPostForm } from "../../../shared/api/http";
import { KnowledgeDocumentList, type KnowledgeDocument } from "../components/KnowledgeDocumentList";
import { KnowledgeForm, type KnowledgeFormValue } from "../components/KnowledgeForm";

export function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [searchResults, setSearchResults] = useState<KnowledgeDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    const response = await apiGet<ApiEnvelope<KnowledgeDocument[]>>("/knowledgebase?limit=100");
    setDocuments(response.data);
  }, []);

  useEffect(() => {
    loadDocuments()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadDocuments]);

  async function handleCreateKnowledge(value: KnowledgeFormValue) {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (value.file) {
        const formData = new FormData();
        formData.append("title", value.title);
        formData.append("content", value.content);
        formData.append("tags", JSON.stringify(value.tags));
        formData.append("file", value.file);

        if (value.source) {
          formData.append("source", value.source);
        }

        await apiPostForm<ApiEnvelope<KnowledgeDocument>>("/knowledgebase", formData);
      } else {
        await apiPost<ApiEnvelope<KnowledgeDocument>>("/knowledgebase", value);
      }

      setSuccess("Knowledge set saved to MinIO/MongoDB and queued for vector search.");
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add knowledge document");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteKnowledge(document: KnowledgeDocument) {
    const confirmed = window.confirm(
      `Delete "${document.title}"? This removes the MinIO object, Qdrant vector, and MongoDB record.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(document.id);
    setError(null);
    setSuccess(null);

    try {
      await apiDelete<ApiEnvelope<{ id: string }>>(`/knowledgebase/${document.id}`);
      setDocuments((currentDocuments) => currentDocuments.filter((item) => item.id !== document.id));
      setSearchResults((currentResults) => currentResults.filter((item) => item.id !== document.id));
      setSuccess("Knowledge set deleted from MinIO, Qdrant, and MongoDB.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete knowledge document");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const response = await apiPost<ApiEnvelope<KnowledgeDocument[]>>("/knowledgebase/search", {
        query: searchQuery,
        limit: 5,
      });
      setSearchResults(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search knowledgebase");
    } finally {
      setSearching(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Knowledgebase</h1>
          <p>Manage the content that Qdrant retrieves before the AI agent answers Discord customers.</p>
        </div>
        <button className="button secondary" type="button" onClick={() => void loadDocuments()}>
          Refresh
        </button>
      </header>

      {error ? <div className="error" style={{ marginBottom: 16 }}>{error}</div> : null}
      {success ? <div className="success" style={{ marginBottom: 16 }}>{success}</div> : null}

      <div className="grid two-column">
        <div className="card">
          <h2>Add knowledge</h2>
          <p className="muted">
            Documents are stored in MinIO, recorded in MongoDB, and embedded into your self-hosted Qdrant collection.
          </p>
          <KnowledgeForm submitting={submitting} onSubmit={handleCreateKnowledge} />
        </div>

        <div className="grid">
          <div className="card">
            <h2>Search knowledge</h2>
            <form className="row" style={{ alignItems: "stretch", margin: "16px 0" }} onSubmit={handleSearch}>
              <input
                aria-label="Search query"
                placeholder="Search with a customer-like question"
                style={{ flex: 1 }}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button className="button" disabled={searching} type="submit">
                {searching ? "Searching..." : "Search"}
              </button>
            </form>
            <KnowledgeDocumentList documents={searchResults} emptyMessage="No search results yet." />
          </div>

          <div className="card">
            <div className="row" style={{ marginBottom: 18 }}>
              <h2>Recent documents</h2>
              <span className="badge">{documents.length} documents</span>
            </div>
            {loading ? (
              <p className="muted">Loading knowledgebase...</p>
            ) : (
              <KnowledgeDocumentList
                documents={documents}
                deletingId={deletingId}
                emptyMessage="No knowledge documents have been added yet."
                onDelete={handleDeleteKnowledge}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
