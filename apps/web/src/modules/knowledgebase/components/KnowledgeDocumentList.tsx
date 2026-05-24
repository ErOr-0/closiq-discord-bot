export type KnowledgeStorage = {
  provider: "minio";
  bucket: string;
  objectKey: string;
  folder: string;
  originalName: string;
  contentType?: string;
  size?: number;
};

export type KnowledgeDocument = {
  id: string;
  title: string;
  content: string;
  source?: string;
  tags: string[];
  qdrantPointId?: string;
  storage?: KnowledgeStorage;
  score?: number;
  createdAt?: string;
};

type KnowledgeDocumentListProps = {
  documents: KnowledgeDocument[];
  emptyMessage: string;
  deletingId?: string | null;
  onDelete?: (document: KnowledgeDocument) => Promise<void> | void;
};

export function KnowledgeDocumentList({
  documents,
  emptyMessage,
  deletingId,
  onDelete,
}: KnowledgeDocumentListProps) {
  if (!documents.length) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <div className="knowledge-list">
      {documents.map((document) => (
        <article className="knowledge-card" key={document.id}>
          <div className="row card-heading">
            <h3>{document.title}</h3>
            <div className="row actions">
              {typeof document.score === "number" ? <span className="badge">{document.score.toFixed(3)}</span> : null}
              {onDelete ? (
                <button
                  className="button danger small"
                  disabled={deletingId === document.id}
                  type="button"
                  onClick={() => void onDelete(document)}
                >
                  {deletingId === document.id ? "Deleting..." : "Delete"}
                </button>
              ) : null}
            </div>
          </div>
          <p>{document.content}</p>
          <div className="knowledge-meta muted">
            <small>{document.source ?? "Internal"}</small>
            <small>{document.tags.length ? document.tags.join(", ") : "No tags"}</small>
            {document.storage ? (
              <small>
                MinIO: {document.storage.bucket}/{document.storage.objectKey}
              </small>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
