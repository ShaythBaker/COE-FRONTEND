import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
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
} from "reactstrap";

import { get, post } from "../../helpers/api_helper";
import {
  PUBLIC_EVALUATION,
  PUBLIC_EVALUATION_LOGIN,
  PUBLIC_EVALUATION_SUBMIT,
} from "../../helpers/url_helper";
import { notifyError, notifySuccess } from "../../helpers/notify";

const asArray = value => (Array.isArray(value) ? value : []);

const normalizeId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return normalizeId(value._id);
  if (value?.$oid) return value.$oid;
  return String(value);
};

const PublicEvaluationPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileReference, setFileReference] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [client, setClient] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "Public Evaluation | Skote";
  }, []);

  useEffect(() => {
    const loadEvaluation = async () => {
      try {
        setLoading(true);
        const response = await get(PUBLIC_EVALUATION(token));
        setFileReference(response?.FILE_REFERENCE || "");
      } catch (error) {
        notifyError(
          error?.response?.data?.message || "Evaluation link is not available."
        );
      } finally {
        setLoading(false);
      }
    };

    loadEvaluation();
  }, [token]);

  const answeredQuestions = useMemo(
    () =>
      questions.filter(question => {
        const rating = Number(answers[normalizeId(question?._id)]?.rating || 0);
        return rating > 0;
      }).length,
    [answers, questions]
  );

  const login = async event => {
    event.preventDefault();

    if (!String(passportNo || "").trim()) {
      notifyError("Enter your passport number.");
      return;
    }

    try {
      setLoggingIn(true);
      const response = await post(PUBLIC_EVALUATION_LOGIN(token), {
        passportNo,
      });
      const nextQuestions = asArray(response?.evaluation?.QUESTIONS);
      setClient(response?.client || null);
      setQuestions(nextQuestions);
      setAnswers(
        nextQuestions.reduce((map, question) => {
          map[normalizeId(question?._id)] = { rating: 0, comment: "" };
          return map;
        }, {})
      );
      notifySuccess("Passport verified.");
    } catch (error) {
      notifyError(error?.response?.data?.message || "Passport number was not found.");
    } finally {
      setLoggingIn(false);
    }
  };

  const setRating = (questionId, rating) => {
    setAnswers(current => ({
      ...current,
      [questionId]: {
        ...(current[questionId] || {}),
        rating,
      },
    }));
  };

  const setComment = (questionId, comment) => {
    setAnswers(current => ({
      ...current,
      [questionId]: {
        ...(current[questionId] || {}),
        comment,
      },
    }));
  };

  const submit = async () => {
    const missingAnswer = questions.find(question => {
      const questionId = normalizeId(question?._id);
      return !Number(answers[questionId]?.rating || 0);
    });

    if (missingAnswer) {
      notifyError("Answer every question before submitting.");
      return;
    }

    const missingLowScoreNote = questions.find(question => {
      const questionId = normalizeId(question?._id);
      const answer = answers[questionId] || {};
      return Number(answer.rating || 0) <= 3 && !String(answer.comment || "").trim();
    });

    if (missingLowScoreNote) {
      notifyError("Add a note for every rating of 3 stars or less.");
      return;
    }

    try {
      setSubmitting(true);
      await post(PUBLIC_EVALUATION_SUBMIT(token), {
        passportNo,
        answers: questions.map(question => {
          const questionId = normalizeId(question?._id);
          const answer = answers[questionId] || {};
          return {
            questionId,
            rating: Number(answer.rating || 0),
            comment: String(answer.comment || "").trim(),
          };
        }),
      });
      setSubmitted(true);
      notifySuccess("Evaluation approved. Thank you.");
    } catch (error) {
      notifyError(error?.response?.data?.message || "Failed to submit evaluation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center py-5">
          <Spinner size="sm" className="me-2" />
          Loading evaluation...
        </div>
      </Container>
    );
  }

  return (
    <div className="account-pages py-5">
      <Container>
        <Row className="justify-content-center">
          <Col lg="8" xl="7">
            <Card>
              <CardBody className="p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                  <div>
                    <h3 className="mb-1">Evaluation</h3>
                    <div className="text-muted">
                      File {fileReference || "-"}
                    </div>
                  </div>
                  <Badge color="primary" pill>
                    Published
                  </Badge>
                </div>

                {submitted ? (
                  <Alert color="success" className="mb-0">
                    Your evaluation was approved successfully.
                  </Alert>
                ) : !client ? (
                  <form onSubmit={login}>
                    <Label className="form-label fw-semibold">Passport No</Label>
                    <Input
                      value={passportNo}
                      onChange={event => setPassportNo(event.target.value)}
                      placeholder="Enter the passport number from the reservation file"
                      className="mb-3"
                    />
                    <Button color="primary" type="submit" disabled={loggingIn}>
                      {loggingIn ? <Spinner size="sm" className="me-2" /> : null}
                      Login
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="d-flex flex-wrap justify-content-between gap-2 mb-3">
                      <div>
                        <div className="fw-semibold">{client?.name || "Guest"}</div>
                        <div className="text-muted small">
                          {answeredQuestions} of {questions.length} answered
                        </div>
                      </div>
                      <Badge color="info" pill>
                        Passport Verified
                      </Badge>
                    </div>

                    {questions.map((question, index) => {
                      const questionId = normalizeId(question?._id);
                      const answer = answers[questionId] || {};
                      const rating = Number(answer.rating || 0);

                      return (
                        <div key={questionId || index} className="border rounded p-3 mb-3">
                          <div className="fw-semibold mb-3">
                            {index + 1}. {question?.questionText || "-"}
                          </div>
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            {[1, 2, 3, 4, 5].map(value => (
                              <Button
                                key={value}
                                type="button"
                                color={rating >= value ? "warning" : "light"}
                                className={rating >= value ? "" : "border"}
                                onClick={() => setRating(questionId, value)}
                              >
                                {value} <span aria-hidden="true">&#9733;</span>
                              </Button>
                            ))}
                          </div>
                          {rating > 0 && rating <= 3 ? (
                            <>
                              <Label className="form-label fw-semibold">
                                Notes
                              </Label>
                              <Input
                                type="textarea"
                                rows={3}
                                value={answer.comment || ""}
                                onChange={event =>
                                  setComment(questionId, event.target.value)
                                }
                                placeholder="Tell us why you chose this rating"
                              />
                            </>
                          ) : null}
                        </div>
                      );
                    })}

                    <div className="text-end">
                      <Button color="primary" onClick={submit} disabled={submitting}>
                        {submitting ? <Spinner size="sm" className="me-2" /> : null}
                        Approved
                      </Button>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default PublicEvaluationPage;
