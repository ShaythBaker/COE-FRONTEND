import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
  Table,
} from "reactstrap";

import Breadcrumbs from "../../components/Common/Breadcrumb";
import { get, post } from "../../helpers/api_helper";
import {
  EVALUATION_DRAFT,
  EVALUATION_FILES,
  EVALUATIONS,
} from "../../helpers/url_helper";
import { notifyError, notifySuccess } from "../../helpers/notify";
import {
  EVALUATION_STATUS,
  buildEvaluationReviewsPath,
  buildPublicEvaluationUrl,
  canEditEvaluation,
  getEvaluationBadgeColor,
  normalizeEvaluationStatus,
} from "../../helpers/evaluation_workflow";

const TABS = {
  FILES: "files",
  CREATE: "create",
  SAVED: "saved",
  REVIEWS: "reviews",
};

const asArray = value => (Array.isArray(value) ? value : []);

const normalizeId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return normalizeId(value._id);
  if (value?.$oid) return value.$oid;
  return String(value);
};

const buildLocalQuestion = (question, index) => ({
  _clientId:
    normalizeId(question?._id) || `question-${Date.now()}-${index}-${Math.random()}`,
  _id: normalizeId(question?._id),
  questionText: String(question?.questionText || ""),
  sourceType: String(question?.sourceType || "CUSTOM"),
  sourceName: String(question?.sourceName || ""),
  order: Number.isFinite(Number(question?.order)) ? Number(question.order) : index + 1,
  answer: {
    rating: Number(question?.answer?.rating || 0),
    comment: String(question?.answer?.comment || ""),
  },
});

const formatDateLabel = value => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const EvaluationsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TABS.FILES);
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [shareFile, setShareFile] = useState(null);

  useEffect(() => {
    document.title = "Evaluations | Skote";
  }, []);

  const loadFiles = async () => {
    try {
      setFilesLoading(true);
      setFilesError("");
      const response = await get(EVALUATION_FILES);
      setFiles(asArray(response));
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to load evaluation files.";
      setFilesError(message);
      notifyError(message);
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const filteredFiles = useMemo(() => {
    const query = String(search || "").trim().toLowerCase();
    if (!query) return files;

    return files.filter(file => {
      const reference = String(file?.FILE_REFERENCE || "").toLowerCase();
      const reservationStatus = String(
        file?.RESERVATION_FILE_STATUS || ""
      ).toLowerCase();
      const evaluationStatus = String(
        file?.EVALUATION_STATUS || ""
      ).toLowerCase();
      return (
        reference.includes(query) ||
        reservationStatus.includes(query) ||
        evaluationStatus.includes(query)
      );
    });
  }, [files, search]);

  const savedFiles = useMemo(
    () =>
      filteredFiles.filter(
        file =>
          normalizeEvaluationStatus(file?.EVALUATION_STATUS) ===
          EVALUATION_STATUS.SAVED
      ),
    [filteredFiles]
  );

  const publishedFiles = useMemo(
    () =>
      filteredFiles.filter(
        file =>
          normalizeEvaluationStatus(file?.EVALUATION_STATUS) ===
          EVALUATION_STATUS.PUBLISHED
      ),
    [filteredFiles]
  );

  const publicLink = useMemo(() => {
    if (!shareFile?.token || typeof window === "undefined") return "";
    return buildPublicEvaluationUrl(shareFile.token, window.location.origin);
  }, [shareFile]);
  const selectedEvaluationStatus = normalizeEvaluationStatus(
    selectedFile?.evaluationStatus
  );
  const selectedIsPublished =
    selectedEvaluationStatus === EVALUATION_STATUS.PUBLISHED;
  const selectedCanEdit = canEditEvaluation(selectedEvaluationStatus);

  const openDraft = async file => {
    const fileId = normalizeId(file?._id);
    if (!fileId) return;

    try {
      setDraftLoading(true);
      const response = await get(EVALUATION_DRAFT(fileId));
      setSelectedFile({
        _id: fileId,
        FILE_REFERENCE:
          response?.reservationFile?.FILE_REFERENCE || file?.FILE_REFERENCE || "",
        evaluationId: normalizeId(response?.evaluation?._id),
        evaluationStatus: normalizeEvaluationStatus(response?.evaluation?.STATUS),
        publicToken:
          response?.evaluation?.PUBLIC_TOKEN ||
          file?.EVALUATION_PUBLIC_TOKEN ||
          "",
      });
      setQuestions(
        asArray(response?.evaluation?.QUESTIONS).map((question, index) =>
          buildLocalQuestion(question, index)
        )
      );
      setActiveTab(TABS.CREATE);
    } catch (error) {
      notifyError(
        error?.response?.data?.message || "Failed to open evaluation draft."
      );
    } finally {
      setDraftLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions(current => [
      ...current,
      buildLocalQuestion(
        {
          questionText: "",
          sourceType: "CUSTOM",
          sourceName: "",
          order: current.length + 1,
          answer: { rating: 0, comment: "" },
        },
        current.length
      ),
    ]);
  };

  const updateQuestion = (clientId, field, value) => {
    setQuestions(current =>
      current.map(question =>
        question._clientId === clientId
          ? { ...question, [field]: value }
          : question
      )
    );
  };

  const deleteQuestion = clientId => {
    setQuestions(current =>
      current
        .filter(question => question._clientId !== clientId)
        .map((question, index) => ({
          ...question,
          order: index + 1,
        }))
    );
  };

  const openShareModal = file => {
    const token = file?.EVALUATION_PUBLIC_TOKEN || file?.publicToken || "";
    if (!token) {
      notifyError("Publish the evaluation before copying its link.");
      return;
    }

    setShareFile({
      token,
      fileReference: file?.FILE_REFERENCE || file?.FILE_REFERENCE || "",
    });
  };

  const copyPublicLink = async () => {
    if (!publicLink) return;

    try {
      await navigator.clipboard.writeText(publicLink);
      notifySuccess("Evaluation link copied.");
    } catch {
      notifyError("Could not copy the link. Select and copy it manually.");
    }
  };

  const saveEvaluation = async status => {
    if (!selectedFile?._id) {
      notifyError("Choose a file first.");
      return;
    }

    if (!questions.length) {
      notifyError("Add at least one question before saving.");
      return;
    }

    const hasInvalidQuestion = questions.some(
      question => !String(question.questionText || "").trim()
    );
    if (hasInvalidQuestion) {
      notifyError("Every question needs text before saving.");
      return;
    }

    const nextStatus = normalizeEvaluationStatus(status);
    const isPublishing = nextStatus === EVALUATION_STATUS.PUBLISHED;

    try {
      if (isPublishing) {
        setPublishing(true);
      } else {
        setSaving(true);
      }

      const payload = {
        reservationFileId: selectedFile._id,
        status: isPublishing ? EVALUATION_STATUS.PUBLISHED : EVALUATION_STATUS.SAVED,
        questions: questions.map((question, index) => ({
          _id: question._id || undefined,
          questionText: String(question.questionText || "").trim(),
          sourceType: question.sourceType || "CUSTOM",
          sourceName: question.sourceName || "",
          order: index + 1,
          answer: {
            rating: 0,
            comment: "",
          },
        })),
      };

      const saved = await post(EVALUATIONS, payload);
      const nextSelectedFile = {
        ...selectedFile,
        evaluationId: normalizeId(saved?._id),
        evaluationStatus: normalizeEvaluationStatus(saved?.STATUS),
        publicToken: saved?.PUBLIC_TOKEN || selectedFile.publicToken || "",
      };

      setSelectedFile(nextSelectedFile);
      notifySuccess(
        isPublishing
          ? "Evaluation published successfully."
          : "Evaluation saved successfully."
      );
      await loadFiles();

      if (isPublishing) {
        openShareModal({
          ...nextSelectedFile,
          EVALUATION_PUBLIC_TOKEN: nextSelectedFile.publicToken,
        });
      }
    } catch (error) {
      notifyError(
        error?.response?.data?.message || "Failed to save evaluation."
      );
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  const renderTabButton = (tab, label) => (
    <Button
      color={activeTab === tab ? "primary" : "light"}
      className={activeTab === tab ? "" : "border"}
      onClick={() => setActiveTab(tab)}
    >
      {label}
    </Button>
  );

  const renderFilesTable = (rows, emptyText, mode = "files") => (
    <div className="table-responsive">
      <Table className="table align-middle table-nowrap mb-0">
        <thead className="table-light">
          <tr>
            <th>File Number</th>
            <th>Reservation File Status</th>
            <th>Evaluation Status</th>
            {mode === "reviews" ? <th>Reviews</th> : null}
            {mode === "reviews" ? <th>Published</th> : null}
            <th className="text-end">Action</th>
          </tr>
        </thead>
        <tbody>
          {filesLoading ? (
            <tr>
              <td colSpan={mode === "reviews" ? "6" : "4"} className="text-center py-5">
                <Spinner size="sm" className="me-2" />
                Loading files...
              </td>
            </tr>
          ) : filesError ? (
            <tr>
              <td colSpan={mode === "reviews" ? "6" : "4"} className="text-center text-danger py-5">
                {filesError}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={mode === "reviews" ? "6" : "4"} className="text-center text-muted py-5">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map(file => {
              const evaluationStatus = normalizeEvaluationStatus(
                file?.EVALUATION_STATUS
              );
              const isPublished = evaluationStatus === EVALUATION_STATUS.PUBLISHED;
              const isEditable = canEditEvaluation(evaluationStatus);
              const evaluationId = normalizeId(file?.EVALUATION_ID);

              return (
                <tr key={normalizeId(file?._id)}>
                  <td className="fw-semibold">{file?.FILE_REFERENCE || "-"}</td>
                  <td>
                    <Badge color="success" pill>
                      {file?.RESERVATION_FILE_STATUS || "-"}
                    </Badge>
                  </td>
                  <td>
                    <Badge color={getEvaluationBadgeColor(evaluationStatus)} pill>
                      {evaluationStatus}
                    </Badge>
                  </td>
                  {mode === "reviews" ? (
                    <td>{Number(file?.REVIEW_COUNT || 0)}</td>
                  ) : null}
                  {mode === "reviews" ? (
                    <td>{formatDateLabel(file?.EVALUATION_PUBLISHED_ON)}</td>
                  ) : null}
                  <td className="text-end">
                    <div className="d-flex flex-wrap justify-content-end gap-2">
                      {isEditable ? (
                        <Button
                          color="primary"
                          size="sm"
                          onClick={() => openDraft(file)}
                          disabled={draftLoading}
                        >
                          {evaluationStatus === EVALUATION_STATUS.PENDING
                            ? "Create Evaluation"
                            : "Edit Evaluation"}
                        </Button>
                      ) : null}
                      {isPublished ? (
                        <Button
                          color="secondary"
                          size="sm"
                          onClick={() => navigate(buildEvaluationReviewsPath(evaluationId))}
                          disabled={!evaluationId}
                        >
                          View Reviews
                        </Button>
                      ) : null}
                      {isPublished ? (
                        <Button
                          color="info"
                          size="sm"
                          onClick={() => openShareModal(file)}
                        >
                          Share Link
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>
    </div>
  );

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Evaluations" breadcrumbItem="Quality Review" />

        <Card className="mb-3">
          <CardBody>
            <div className="d-flex flex-wrap gap-2">
              {renderTabButton(TABS.FILES, "Approved Files")}
              {renderTabButton(TABS.SAVED, "Saved Evaluations")}
              {renderTabButton(TABS.REVIEWS, "Published Reviews")}
            </div>
          </CardBody>
        </Card>

        {activeTab === TABS.FILES ? (
          <Card className="mb-4">
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h4 className="card-title mb-1">Approved Reservation Files</h4>
                  <p className="text-muted mb-0">
                    Create, save, and publish evaluation questions for approved files.
                  </p>
                </div>
                <Input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search by file number or status"
                  style={{ maxWidth: 280 }}
                />
              </div>
              {renderFilesTable(filteredFiles, "No approved reservation files found.")}
            </CardBody>
          </Card>
        ) : activeTab === TABS.SAVED ? (
          <Card className="mb-4">
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h4 className="card-title mb-1">Saved Evaluations</h4>
                  <p className="text-muted mb-0">
                    Open any saved evaluation to review, edit, or publish it.
                  </p>
                </div>
                <Input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search by file number or status"
                  style={{ maxWidth: 280 }}
                />
              </div>
              {renderFilesTable(savedFiles, "No saved evaluations found.")}
            </CardBody>
          </Card>
        ) : activeTab === TABS.REVIEWS ? (
          <Card className="mb-4">
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h4 className="card-title mb-1">Published Reviews</h4>
                  <p className="text-muted mb-0">
                    Open published files to see customer review submissions.
                  </p>
                </div>
                <Input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search by file number or status"
                  style={{ maxWidth: 280 }}
                />
              </div>
              {renderFilesTable(
                publishedFiles,
                "No published evaluations found.",
                "reviews"
              )}
            </CardBody>
          </Card>
        ) : activeTab === TABS.EVALUATED ? (
          <Card className="mb-4">
            <CardBody />
          </Card>
        ) : (
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h4 className="card-title mb-1">Create Evaluation</h4>
                  <p className="text-muted mb-0">
                    Build the questions, save them, or publish a public evaluation link.
                  </p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <Button
                    color="light"
                    className="border"
                    onClick={() => setActiveTab(TABS.FILES)}
                  >
                    Back to Files
                  </Button>
                  {selectedCanEdit ? (
                    <>
                      <Button
                        color="success"
                        onClick={addQuestion}
                        disabled={!selectedFile?._id || draftLoading}
                      >
                        Add Question
                      </Button>
                      <Button
                        color="primary"
                        onClick={() => saveEvaluation(EVALUATION_STATUS.SAVED)}
                        disabled={saving || publishing || draftLoading || !selectedFile?._id}
                      >
                        {saving ? <Spinner size="sm" className="me-2" /> : null}
                        Save Evaluation
                      </Button>
                      <Button
                        color="info"
                        onClick={() => saveEvaluation(EVALUATION_STATUS.PUBLISHED)}
                        disabled={saving || publishing || draftLoading || !selectedFile?._id}
                      >
                        {publishing ? <Spinner size="sm" className="me-2" /> : null}
                        Publish
                      </Button>
                    </>
                  ) : null}
                  {selectedIsPublished && selectedFile?.evaluationId ? (
                    <Button
                      color="primary"
                      onClick={() =>
                        navigate(buildEvaluationReviewsPath(selectedFile.evaluationId))
                      }
                    >
                      View Reviews
                    </Button>
                  ) : null}
                </div>
              </div>

              {!selectedFile?._id ? (
                <div className="rounded border bg-light p-4 text-center text-muted">
                  Click Create Evaluation from the files list to load and edit the questions.
                </div>
              ) : draftLoading ? (
                <div className="text-center py-5">
                  <Spinner size="sm" className="me-2" />
                  Loading evaluation draft...
                </div>
              ) : (
                <>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
                    <Badge color="info" pill>
                      File: {selectedFile.FILE_REFERENCE}
                    </Badge>
                    <Badge
                      color={getEvaluationBadgeColor(selectedFile.evaluationStatus)}
                      pill
                    >
                      {normalizeEvaluationStatus(selectedFile.evaluationStatus)}
                    </Badge>
                    {selectedFile.publicToken ? (
                      <Button
                        color="light"
                        className="border"
                        size="sm"
                        onClick={() => openShareModal(selectedFile)}
                      >
                        Share Link
                      </Button>
                    ) : null}
                  </div>

                  {!questions.length ? (
                    <div className="rounded border bg-light p-4 text-center text-muted">
                      No questions yet. Add your first question.
                    </div>
                  ) : null}

                  {questions.map((question, index) => (
                    <Card key={question._clientId} className="border mb-3">
                      <CardBody>
                        <Row className="g-3">
                          <Col lg="10">
                            <Label className="form-label fw-semibold">
                              Question {index + 1}
                            </Label>
                            <Input
                              value={question.questionText}
                              readOnly={!selectedCanEdit}
                              onChange={event =>
                                updateQuestion(
                                  question._clientId,
                                  "questionText",
                                  event.target.value
                                )
                              }
                              placeholder="Write the evaluation question"
                            />
                          </Col>
                          {selectedCanEdit ? (
                            <Col lg="2" className="d-flex justify-content-end align-items-end">
                              <Button
                                color="danger"
                                onClick={() => deleteQuestion(question._clientId)}
                              >
                                Delete Question
                              </Button>
                            </Col>
                          ) : null}
                        </Row>
                      </CardBody>
                    </Card>
                  ))}
                </>
              )}
            </CardBody>
          </Card>
        )}
      </Container>

      <Modal isOpen={!!shareFile} toggle={() => setShareFile(null)} centered>
        <ModalHeader toggle={() => setShareFile(null)}>
          Evaluation Link {shareFile?.fileReference ? `- ${shareFile.fileReference}` : ""}
        </ModalHeader>
        <ModalBody>
          <Label className="form-label fw-semibold">Public Link</Label>
          <Input value={publicLink} readOnly className="mb-3" />
          {publicLink ? (
            <div className="text-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(publicLink)}`}
                alt="Evaluation QR code"
                width="220"
                height="220"
              />
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button color="light" className="border" onClick={() => setShareFile(null)}>
            Close
          </Button>
          <Button color="primary" onClick={copyPublicLink} disabled={!publicLink}>
            Copy
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default EvaluationsPage;
