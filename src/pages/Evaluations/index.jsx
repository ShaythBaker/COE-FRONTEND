import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Label,
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

const TABS = {
  FILES: "files",
  CREATE: "create",
  SAVED: "saved",
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeId = (value) => {
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

const EvaluationsPage = () => {
  const [activeTab, setActiveTab] = useState(TABS.FILES);
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [draftLoading, setDraftLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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

    return files.filter((file) => {
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
        (file) => String(file?.EVALUATION_STATUS || "").toLowerCase() === "saved"
      ),
    [filteredFiles]
  );

  const openDraft = async (file) => {
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
    setQuestions((current) => [
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
    setQuestions((current) =>
      current.map((question) =>
        question._clientId === clientId
          ? { ...question, [field]: value }
          : question
      )
    );
  };

  const deleteQuestion = (clientId) => {
    setQuestions((current) =>
      current
        .filter((question) => question._clientId !== clientId)
        .map((question, index) => ({
          ...question,
          order: index + 1,
        }))
    );
  };

  const saveEvaluation = async () => {
    if (!selectedFile?._id) {
      notifyError("Choose a file first.");
      return;
    }

    if (!questions.length) {
      notifyError("Add at least one question before saving.");
      return;
    }

    const hasInvalidQuestion = questions.some(
      (question) => !String(question.questionText || "").trim()
    );
    if (hasInvalidQuestion) {
      notifyError("Every question needs text before saving.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        reservationFileId: selectedFile._id,
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

      await post(EVALUATIONS, payload);
      notifySuccess("Evaluation saved successfully.");
      await loadFiles();
      await openDraft(selectedFile);
    } catch (error) {
      notifyError(
        error?.response?.data?.message || "Failed to save evaluation."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Evaluations" breadcrumbItem="Quality Review" />

        <Card className="mb-3">
          <CardBody>
            <div className="d-flex flex-wrap gap-2">
              <Button
                color={activeTab === TABS.FILES ? "primary" : "light"}
                className={activeTab === TABS.FILES ? "" : "border"}
                onClick={() => setActiveTab(TABS.FILES)}
              >
                Files List
              </Button>
              <Button
                color={activeTab === TABS.SAVED ? "primary" : "light"}
                className={activeTab === TABS.SAVED ? "" : "border"}
                onClick={() => setActiveTab(TABS.SAVED)}
              >
                Saved Evaluations
              </Button>
            </div>
          </CardBody>
        </Card>

        {activeTab === TABS.FILES ? (
          <Card className="mb-4">
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h4 className="card-title mb-1">Files List of All Files</h4>
                  <p className="text-muted mb-0">
                    Create and save evaluation questions for each file.
                  </p>
                </div>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by file number or status"
                  style={{ maxWidth: 280 }}
                />
              </div>

              <div className="table-responsive">
                <Table className="table align-middle table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>File Number</th>
                      <th>Reservation File Status</th>
                      <th>Evaluation Status</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filesLoading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-5">
                          <Spinner size="sm" className="me-2" />
                          Loading files...
                        </td>
                      </tr>
                    ) : filesError ? (
                      <tr>
                        <td colSpan="4" className="text-center text-danger py-5">
                          {filesError}
                        </td>
                      </tr>
                    ) : filteredFiles.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center text-muted py-5">
                          No files found.
                        </td>
                      </tr>
                    ) : (
                      filteredFiles.map((file) => (
                        <tr key={normalizeId(file?._id)}>
                        <td className="fw-semibold">
                          {file?.FILE_REFERENCE || "-"}
                        </td>
                        <td>
                          <Badge
                            color="info"
                            pill
                          >
                            {file?.RESERVATION_FILE_STATUS || "-"}
                          </Badge>
                        </td>
                        <td>
                          <Badge
                            color={
                              file?.EVALUATION_STATUS === "Saved"
                                ? "success"
                                : "warning"
                            }
                            pill
                          >
                            {file?.EVALUATION_STATUS || "Pending"}
                          </Badge>
                        </td>
                        <td className="text-end">
                            <Button
                              color="primary"
                              size="sm"
                            onClick={() => openDraft(file)}
                            disabled={draftLoading}
                          >
                            {file?.EVALUATION_STATUS === "Saved"
                              ? "Edit Evaluation"
                              : "Create Evaluation"}
                          </Button>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        ) : activeTab === TABS.SAVED ? (
          <Card className="mb-4">
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h4 className="card-title mb-1">Saved Evaluations</h4>
                  <p className="text-muted mb-0">
                    Open any saved evaluation to review or edit it.
                  </p>
                </div>
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by file number or status"
                  style={{ maxWidth: 280 }}
                />
              </div>

              <div className="table-responsive">
                <Table className="table align-middle table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>File Number</th>
                      <th>Reservation File Status</th>
                      <th>Evaluation Status</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filesLoading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-5">
                          <Spinner size="sm" className="me-2" />
                          Loading saved evaluations...
                        </td>
                      </tr>
                    ) : filesError ? (
                      <tr>
                        <td colSpan="4" className="text-center text-danger py-5">
                          {filesError}
                        </td>
                      </tr>
                    ) : savedFiles.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center text-muted py-5">
                          No saved evaluations found.
                        </td>
                      </tr>
                    ) : (
                      savedFiles.map((file) => (
                        <tr key={normalizeId(file?._id)}>
                          <td className="fw-semibold">
                            {file?.FILE_REFERENCE || "-"}
                          </td>
                          <td>
                            <Badge color="info" pill>
                              {file?.RESERVATION_FILE_STATUS || "-"}
                            </Badge>
                          </td>
                          <td>
                            <Badge color="success" pill>
                              {file?.EVALUATION_STATUS || "Saved"}
                            </Badge>
                          </td>
                          <td className="text-end">
                            <Button
                              color="primary"
                              size="sm"
                              onClick={() => openDraft(file)}
                              disabled={draftLoading}
                            >
                              Edit Evaluation
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h4 className="card-title mb-1">Create Evaluation</h4>
                  <p className="text-muted mb-0">
                    Build the questions now and save them for sending later.
                  </p>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <Button color="success" onClick={addQuestion} disabled={!selectedFile?._id || draftLoading}>
                    Add Question
                  </Button>
                  <Button color="primary" onClick={saveEvaluation} disabled={saving || draftLoading || !selectedFile?._id}>
                    {saving ? <Spinner size="sm" className="me-2" /> : null}
                    Save Evaluation
                  </Button>
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
                              onChange={(event) =>
                                updateQuestion(
                                  question._clientId,
                                  "questionText",
                                  event.target.value
                                )
                              }
                            placeholder="Write the evaluation question"
                          />
                        </Col>
                        <Col lg="2" className="d-flex justify-content-end align-items-end">
                          <Button
                            color="danger"
                            onClick={() => deleteQuestion(question._clientId)}
                            >
                              Delete Question
                            </Button>
                          </Col>
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
    </div>
  );
};

export default EvaluationsPage;
