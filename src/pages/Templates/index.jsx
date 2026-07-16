import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Form,
  FormFeedback,
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

import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../../store/Templates/actions";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";

const TEMPLATE_TYPE_OPTIONS = [
  { value: "ARRIVAL_DEPARTURE", label: "Arrival and Departure" },
  { value: "INCLUSIONS_EXCLUSIONS", label: "Inclusions and Exclusions" },
  { value: "GENERAL_NOTES", label: "General Notes" },
  { value: "BANK_ACCOUNT", label: "Bank Account Detail" },
  { value: "CUSTOM", label: "Custom" },
];

const emptyForm = {
  TEMPLATE_NAME: "",
  TEMPLATE_TYPE: "CUSTOM",
  TEMPLATE_CONTENT_HTML: "<p>Type your template content here.</p>",
  SORT_ORDER: 100,
  TEMPLATE_STATUS: true,
  ACTIVE_STATUS: true,
};

const typeLabel = value =>
  TEMPLATE_TYPE_OPTIONS.find(option => option.value === value)?.label || "Custom";

const stripHtml = value =>
  String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeForm = item => ({
  TEMPLATE_NAME: item?.TEMPLATE_NAME || "",
  TEMPLATE_TYPE: item?.TEMPLATE_TYPE || "CUSTOM",
  TEMPLATE_CONTENT_HTML:
    item?.TEMPLATE_CONTENT_HTML || "<p>Type your template content here.</p>",
  SORT_ORDER: Number(item?.SORT_ORDER ?? 100),
  TEMPLATE_STATUS:
    typeof item?.TEMPLATE_STATUS === "boolean" ? item.TEMPLATE_STATUS : true,
  ACTIVE_STATUS:
    typeof item?.ACTIVE_STATUS === "boolean" ? item.ACTIVE_STATUS : true,
});

const editorButtonStyle = {
  minWidth: 36,
};

const RichTextEditor = ({ value, onChange }) => {
  const editorRef = useRef(null);
  const lastHtmlRef = useRef("");
  const savedSelectionRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = value || "";

    if (nextValue !== lastHtmlRef.current && editor.innerHTML !== nextValue) {
      editor.innerHTML = nextValue;
    }
    lastHtmlRef.current = nextValue;
  }, [value]);

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection?.();
    if (!editor || !selection?.rangeCount) return;
    if (!selection.anchorNode) return;
    if (!editor.contains(selection.anchorNode)) return;
    savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    const range = savedSelectionRef.current;
    const selection = window.getSelection?.();
    if (!editor || !range || !selection) return;
    if (!editor.contains(range.commonAncestorContainer)) return;

    selection.removeAllRanges();
    selection.addRange(range);
  };

  const syncValue = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
    }
  };

  const handleInput = () => {
    syncValue();
    saveSelection();
  };

  const runCommand = (command, commandValue = null) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    syncValue();
  };

  const handleCreateLink = () => {
    const url = window.prompt("Enter link URL");
    if (!url) return;
    runCommand("createLink", url);
  };

  const handleInsertTable = () => {
    runCommand(
      "insertHTML",
      `
        <table style="width: 100%; border-collapse: collapse;" border="1" cellpadding="6">
          <tbody>
            <tr>
              <td><strong>Label:</strong></td>
              <td></td>
            </tr>
            <tr>
              <td><strong>Label:</strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <p><br></p>
      `,
    );
  };

  return (
    <div className="border rounded">
      <div className="d-flex flex-wrap align-items-center gap-2 border-bottom bg-light p-2">
        <ButtonGroup size="sm">
          <Button
            color="light"
            type="button"
            style={editorButtonStyle}
            onMouseDown={event => event.preventDefault()}
            onClick={() => runCommand("bold")}
            title="Bold"
          >
            <strong>B</strong>
          </Button>
          <Button
            color="light"
            type="button"
            style={editorButtonStyle}
            onMouseDown={event => event.preventDefault()}
            onClick={() => runCommand("italic")}
            title="Italic"
          >
            <em>I</em>
          </Button>
          <Button
            color="light"
            type="button"
            style={editorButtonStyle}
            onMouseDown={event => event.preventDefault()}
            onClick={() => runCommand("underline")}
            title="Underline"
          >
            <u>U</u>
          </Button>
        </ButtonGroup>

        <ButtonGroup size="sm">
          <Button
            color="light"
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={() => runCommand("formatBlock", "h2")}
          >
            Title
          </Button>
          <Button
            color="light"
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={() => runCommand("formatBlock", "p")}
          >
            Paragraph
          </Button>
        </ButtonGroup>

        <ButtonGroup size="sm">
          <Button
            color="light"
            type="button"
            style={editorButtonStyle}
            onMouseDown={event => event.preventDefault()}
            onClick={() => runCommand("insertOrderedList")}
            title="Numbered list"
          >
            1.
          </Button>
          <Button
            color="light"
            type="button"
            style={editorButtonStyle}
            onMouseDown={event => event.preventDefault()}
            onClick={() => runCommand("insertUnorderedList")}
            title="Bullet list"
          >
            -
          </Button>
        </ButtonGroup>

        <ButtonGroup size="sm">
          <Button
            color="light"
            type="button"
            style={editorButtonStyle}
            onMouseDown={event => event.preventDefault()}
            onClick={() => runCommand("justifyLeft")}
            title="Align left"
          >
            <i className="bx bx-align-left" />
          </Button>
          <Button
            color="light"
            type="button"
            style={editorButtonStyle}
            onMouseDown={event => event.preventDefault()}
            onClick={() => runCommand("justifyCenter")}
            title="Align center"
          >
            <i className="bx bx-align-middle" />
          </Button>
          <Button
            color="light"
            type="button"
            style={editorButtonStyle}
            onMouseDown={event => event.preventDefault()}
            onClick={() => runCommand("justifyRight")}
            title="Align right"
          >
            <i className="bx bx-align-right" />
          </Button>
        </ButtonGroup>

        <Input
          type="color"
          className="form-control form-control-sm"
          title="Text color"
          style={{ width: 44, minHeight: 31, padding: 2 }}
          onChange={event => runCommand("foreColor", event.target.value)}
        />

        <ButtonGroup size="sm">
          <Button
            color="light"
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={handleCreateLink}
          >
            Link
          </Button>
          <Button
            color="light"
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={handleInsertTable}
          >
            Table
          </Button>
          <Button
            color="light"
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={() => runCommand("removeFormat")}
          >
            Clear
          </Button>
        </ButtonGroup>
      </div>

      <div
        ref={editorRef}
        className="template-editor-area"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={saveSelection}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onBlur={syncValue}
      />
    </div>
  );
};

const TemplatesPage = () => {
  document.title = "Templates | COE";

  const dispatch = useDispatch();
  const roles = useSelector(state => state.Login?.roles || []);
  const { items, loading, error } = useSelector(
    state =>
      state.Templates || {
        items: [],
        loading: false,
        error: "",
      },
  );

  const canManageTemplates = hasAnyRole(roles, ["COMPANY_ADMIN", "CONTRACTING"]);

  const [includeInactive, setIncludeInactive] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const params = { includeInactive };
    if (statusFilter !== "all") {
      params.status = statusFilter === "true";
    }
    dispatch(fetchTemplates(params));
  }, [dispatch, includeInactive, statusFilter]);

  const sortedItems = useMemo(() => {
    const list = Array.isArray(items) ? [...items] : [];
    list.sort((a, b) => {
      const orderA = Number(a?.SORT_ORDER ?? 0);
      const orderB = Number(b?.SORT_ORDER ?? 0);
      if (orderA !== orderB) return orderA - orderB;
      return String(a?.TEMPLATE_NAME || "").localeCompare(
        String(b?.TEMPLATE_NAME || ""),
      );
    });
    return list;
  }, [items]);

  const modalTitle = editingItem ? "Edit Template" : "Add Template";

  const resetForm = () => {
    setEditingItem(null);
    setFormValues(emptyForm);
    setFormErrors({});
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    if (!canManageTemplates) {
      notifyError("You do not have permission to manage templates.");
      return;
    }
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = item => {
    if (!canManageTemplates) {
      notifyError("You do not have permission to manage templates.");
      return;
    }
    setEditingItem(item);
    setFormValues(normalizeForm(item));
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleInputChange = event => {
    const { name, value, type, checked } = event.target;
    setFormValues(prev => ({
      ...prev,
      [name]: type === "checkbox" || type === "switch" ? checked : value,
    }));
    setFormErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleEditorChange = html => {
    setFormValues(prev => ({ ...prev, TEMPLATE_CONTENT_HTML: html }));
    setFormErrors(prev => ({ ...prev, TEMPLATE_CONTENT_HTML: "" }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formValues.TEMPLATE_NAME?.trim()) {
      nextErrors.TEMPLATE_NAME = "Template name is required.";
    }

    if (!stripHtml(formValues.TEMPLATE_CONTENT_HTML)) {
      nextErrors.TEMPLATE_CONTENT_HTML = "Template content is required.";
    }

    const sortOrder = Number(formValues.SORT_ORDER);
    if (!Number.isFinite(sortOrder)) {
      nextErrors.SORT_ORDER = "Sort order must be a number.";
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      notifyError("Please fix the validation errors before saving.");
      return false;
    }

    return true;
  };

  const handleSubmit = event => {
    event.preventDefault();

    if (!canManageTemplates) {
      notifyError("You do not have permission to manage templates.");
      return;
    }

    if (!validateForm()) return;

    const payload = {
      TEMPLATE_NAME: formValues.TEMPLATE_NAME.trim(),
      TEMPLATE_TYPE: formValues.TEMPLATE_TYPE,
      TEMPLATE_CONTENT_HTML: formValues.TEMPLATE_CONTENT_HTML,
      SORT_ORDER: Number(formValues.SORT_ORDER || 0),
      TEMPLATE_STATUS: !!formValues.TEMPLATE_STATUS,
    };

    if (editingItem) {
      payload.ACTIVE_STATUS = !!formValues.ACTIVE_STATUS;
    }

    if (editingItem?._id) {
      dispatch(updateTemplate(editingItem._id, payload, closeModal));
    } else {
      dispatch(createTemplate(payload, closeModal));
    }
  };

  const handleToggleStatus = item => {
    if (!canManageTemplates) {
      notifyError("You do not have permission to manage templates.");
      return;
    }

    dispatch(
      updateTemplate(item._id, {
        TEMPLATE_STATUS: !item?.TEMPLATE_STATUS,
      }),
    );
  };

  const handleDelete = item => {
    if (!canManageTemplates) {
      notifyError("You do not have permission to manage templates.");
      return;
    }

    const confirmed = window.confirm(
      `Delete template "${item?.TEMPLATE_NAME || ""}"?`,
    );
    if (!confirmed) return;

    dispatch(deleteTemplate(item._id));
  };

  return (
    <div className="page-content">
      <style>
        {`
          .template-editor-area {
            min-height: 360px;
            padding: 18px;
            background: #fff;
            outline: none;
            line-height: 1.65;
          }

          .template-editor-area:focus {
            box-shadow: inset 0 0 0 2px rgba(85, 110, 230, 0.18);
          }

          .template-editor-area table,
          .template-preview table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
          }

          .template-editor-area td,
          .template-editor-area th,
          .template-preview td,
          .template-preview th {
            border: 1px solid #1f2937;
            padding: 6px 8px;
            vertical-align: top;
          }

          .template-preview {
            min-height: 360px;
            padding: 18px;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            line-height: 1.65;
          }
        `}
      </style>
      <Container fluid>
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="card-title mb-1">Templates</h4>
                  <p className="text-muted mb-0">
                    Manage the approved quotation PDF templates and rich text
                    content.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <div className="form-check form-switch mb-0">
                    <Input
                      id="includeInactiveTemplates"
                      type="switch"
                      checked={includeInactive}
                      onChange={event => setIncludeInactive(event.target.checked)}
                    />
                    <Label
                      className="form-check-label ms-2"
                      for="includeInactiveTemplates"
                    >
                      Include inactive
                    </Label>
                  </div>

                  <Input
                    type="select"
                    value={statusFilter}
                    onChange={event => setStatusFilter(event.target.value)}
                    style={{ width: 150 }}
                  >
                    <option value="all">All status</option>
                    <option value="true">Active templates</option>
                    <option value="false">Inactive templates</option>
                  </Input>

                  <Button
                    color="primary"
                    onClick={openCreateModal}
                    disabled={!canManageTemplates}
                  >
                    Add Template
                  </Button>
                </div>
              </CardHeader>

              <CardBody>
                {!!error && (
                  <div className="alert alert-danger mb-3">{error}</div>
                )}

                <div className="table-responsive">
                  <Table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: 70 }}>#</th>
                        <th>Template Name</th>
                        <th>Type</th>
                        <th>Preview</th>
                        <th>Template Status</th>
                        <th>Record Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4">
                            <Spinner size="sm" className="me-2" />
                            Loading templates...
                          </td>
                        </tr>
                      ) : sortedItems.length ? (
                        sortedItems.map((item, index) => (
                          <tr key={item?._id || index}>
                            <td>{index + 1}</td>
                            <td>
                              <div className="fw-semibold">
                                {item?.TEMPLATE_NAME || "-"}
                              </div>
                              {item?.IS_DEFAULT ? (
                                <small className="text-muted">Default template</small>
                              ) : null}
                            </td>
                            <td>{typeLabel(item?.TEMPLATE_TYPE)}</td>
                            <td style={{ maxWidth: 380 }}>
                              <span className="text-muted">
                                {stripHtml(item?.TEMPLATE_CONTENT_HTML).slice(
                                  0,
                                  130,
                                ) || "-"}
                              </span>
                            </td>
                            <td>
                              {item?.TEMPLATE_STATUS ? (
                                <Badge color="success">Active</Badge>
                              ) : (
                                <Badge color="warning" className="text-dark">
                                  Inactive
                                </Badge>
                              )}
                            </td>
                            <td>
                              {item?.ACTIVE_STATUS ? (
                                <Badge color="success">Active</Badge>
                              ) : (
                                <Badge color="secondary">Deleted</Badge>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="d-flex justify-content-end gap-2 flex-wrap">
                                <Button
                                  color={item?.TEMPLATE_STATUS ? "warning" : "success"}
                                  size="sm"
                                  outline
                                  onClick={() => handleToggleStatus(item)}
                                  disabled={
                                    !canManageTemplates || !item?.ACTIVE_STATUS
                                  }
                                >
                                  {item?.TEMPLATE_STATUS ? "Deactivate" : "Activate"}
                                </Button>
                                <Button
                                  color="secondary"
                                  size="sm"
                                  onClick={() => openEditModal(item)}
                                  disabled={!canManageTemplates}
                                >
                                  Edit
                                </Button>
                                <Button
                                  color="danger"
                                  size="sm"
                                  onClick={() => handleDelete(item)}
                                  disabled={
                                    !canManageTemplates || !item?.ACTIVE_STATUS
                                  }
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-4">
                            No templates found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Modal isOpen={isModalOpen} toggle={closeModal} size="xl" centered>
          <ModalHeader toggle={closeModal}>{modalTitle}</ModalHeader>
          <Form onSubmit={handleSubmit}>
            <ModalBody>
              <Row>
                <Col md="5">
                  <div className="mb-3">
                    <Label htmlFor="TEMPLATE_NAME" className="form-label">
                      Template Name
                    </Label>
                    <Input
                      id="TEMPLATE_NAME"
                      name="TEMPLATE_NAME"
                      type="text"
                      value={formValues.TEMPLATE_NAME}
                      onChange={handleInputChange}
                      invalid={!!formErrors.TEMPLATE_NAME}
                      placeholder="Example: Arrival and Departure Template"
                    />
                    {formErrors.TEMPLATE_NAME ? (
                      <FormFeedback>{formErrors.TEMPLATE_NAME}</FormFeedback>
                    ) : null}
                  </div>
                </Col>

                <Col md="3">
                  <div className="mb-3">
                    <Label htmlFor="TEMPLATE_TYPE" className="form-label">
                      Template Type
                    </Label>
                    <Input
                      id="TEMPLATE_TYPE"
                      name="TEMPLATE_TYPE"
                      type="select"
                      value={formValues.TEMPLATE_TYPE}
                      onChange={handleInputChange}
                    >
                      {TEMPLATE_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Input>
                  </div>
                </Col>

                <Col md="2">
                  <div className="mb-3">
                    <Label htmlFor="SORT_ORDER" className="form-label">
                      Order
                    </Label>
                    <Input
                      id="SORT_ORDER"
                      name="SORT_ORDER"
                      type="number"
                      value={formValues.SORT_ORDER}
                      onChange={handleInputChange}
                      invalid={!!formErrors.SORT_ORDER}
                    />
                    {formErrors.SORT_ORDER ? (
                      <FormFeedback>{formErrors.SORT_ORDER}</FormFeedback>
                    ) : null}
                  </div>
                </Col>

                <Col md="2">
                  <div className="mb-3">
                    <Label className="form-label d-block">PDF Status</Label>
                    <div className="form-check form-switch form-switch-md">
                      <Input
                        id="TEMPLATE_STATUS"
                        name="TEMPLATE_STATUS"
                        type="switch"
                        checked={!!formValues.TEMPLATE_STATUS}
                        onChange={handleInputChange}
                      />
                      <Label className="form-check-label ms-2" for="TEMPLATE_STATUS">
                        {formValues.TEMPLATE_STATUS ? "Active" : "Inactive"}
                      </Label>
                    </div>
                  </div>
                </Col>

                {editingItem ? (
                  <Col md="12">
                    <div className="form-check form-switch form-switch-md mb-3">
                      <Input
                        id="ACTIVE_STATUS_TEMPLATE"
                        name="ACTIVE_STATUS"
                        type="switch"
                        checked={!!formValues.ACTIVE_STATUS}
                        onChange={handleInputChange}
                      />
                      <Label
                        className="form-check-label ms-2"
                        for="ACTIVE_STATUS_TEMPLATE"
                      >
                        Record Active Status
                      </Label>
                    </div>
                  </Col>
                ) : null}

                <Col lg="7">
                  <div className="mb-3">
                    <Label className="form-label">Template Editor</Label>
                    <RichTextEditor
                      value={formValues.TEMPLATE_CONTENT_HTML}
                      onChange={handleEditorChange}
                    />
                    {formErrors.TEMPLATE_CONTENT_HTML ? (
                      <div className="text-danger small mt-2">
                        {formErrors.TEMPLATE_CONTENT_HTML}
                      </div>
                    ) : null}
                  </div>
                </Col>

                <Col lg="5">
                  <div className="mb-3">
                    <Label className="form-label">Preview</Label>
                    <div
                      className="template-preview"
                      dangerouslySetInnerHTML={{
                        __html: formValues.TEMPLATE_CONTENT_HTML || "",
                      }}
                    />
                  </div>
                </Col>
              </Row>
            </ModalBody>

            <ModalFooter>
              <Button color="light" type="button" onClick={closeModal}>
                Cancel
              </Button>
              <Button color="primary" type="submit" disabled={loading}>
                {loading ? <Spinner size="sm" className="me-2" /> : null}
                {editingItem ? "Update" : "Create"}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default TemplatesPage;
