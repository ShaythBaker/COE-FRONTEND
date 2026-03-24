// path: src/pages/Users/DynamicLists/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
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
import { useDispatch, useSelector } from "react-redux";

import Breadcrumbs from "../../../components/Common/Breadcrumb";

import {
  fetchListItems,
  createListItem,
  updateListItem,
  deleteListItem,
  resetListItemsFlags,
} from "../../../store/listItems/actions";

const ALLOWED_LIST_KEYS = ["CITIES", "COUNTRIES", "HOTELSTARS", "HOTELCHAINS", "HOTELSEASONS", "RESTAURANTS_MEALS"];

const DynamicListsPage = () => {
  document.title = "Dynamic Lists | COE";

  const dispatch = useDispatch();

  const { items, loading, error, lastOp } = useSelector((state) => state?.ListItems || {});
  const [listKey, setListKey] = useState("CITIES");

  // Create/Edit modal
  const [isUpsertOpen, setIsUpsertOpen] = useState(false);
  const [editing, setEditing] = useState(null); // row or null

  // Delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Form state
  const [form, setForm] = useState({
    ITEM_VALUE: "",
    ITEM_KEY: "",
    SORT_ORDER: 0,
    ACTIVE_STATUS: true,
  });
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");

  const sortedItems = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];
    arr.sort((a, b) => {
      const soA = Number(a?.SORT_ORDER ?? 0);
      const soB = Number(b?.SORT_ORDER ?? 0);
      if (soA !== soB) return soA - soB;
      const vA = String(a?.ITEM_VALUE ?? "").toLowerCase();
      const vB = String(b?.ITEM_VALUE ?? "").toLowerCase();
      return vA.localeCompare(vB);
    });
    return arr;
  }, [items]);

  const openAdd = () => {
    setEditing(null);
    setTouched({});
    setFormError("");
    setForm({
      ITEM_VALUE: "",
      ITEM_KEY: "",
      SORT_ORDER: 0,
      ACTIVE_STATUS: true,
    });
    setIsUpsertOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setTouched({});
    setFormError("");
    setForm({
      ITEM_VALUE: row?.ITEM_VALUE ?? "",
      ITEM_KEY: row?.ITEM_KEY ?? "",
      SORT_ORDER: Number(row?.SORT_ORDER ?? 0),
      ACTIVE_STATUS: !!row?.ACTIVE_STATUS,
    });
    setIsUpsertOpen(true);
  };

  const closeUpsert = () => {
    setIsUpsertOpen(false);
    setEditing(null);
  };

  const openDelete = (row) => {
    setDeleting(row);
    setIsDeleteOpen(true);
  };

  const closeDelete = () => {
    setIsDeleteOpen(false);
    setDeleting(null);
  };

  const validate = () => {
    if (!ALLOWED_LIST_KEYS.includes(listKey)) return "LIST_KEY is invalid";
    if (!String(form.ITEM_VALUE || "").trim()) return "ITEM_VALUE is required";
    return "";
  };

  const onSubmitUpsert = (e) => {
    e.preventDefault();
    setTouched({ ITEM_VALUE: true });

    const v = validate();
    if (v) {
      setFormError(v);
      return;
    }
    setFormError("");

    const payload = {
      LIST_KEY: listKey, // read-only from selected list
      ITEM_VALUE: String(form.ITEM_VALUE).trim(),
      ITEM_KEY: String(form.ITEM_KEY || "").trim() || null,
      SORT_ORDER: Number(form.SORT_ORDER || 0),
      ACTIVE_STATUS: !!form.ACTIVE_STATUS,
    };

    if (editing?.id || editing?._id || editing?.ID) {
      const id = editing.id ?? editing._id ?? editing.ID;
      dispatch(updateListItem(id, payload));
      return;
    }

    dispatch(createListItem(payload));
  };

  const onConfirmDelete = () => {
    const id = deleting?.id ?? deleting?._id ?? deleting?.ID;
    if (!id) return;
    dispatch(deleteListItem(id));
  };

  // Fetch on load and when list key changes
  useEffect(() => {
    dispatch(fetchListItems(listKey));
  }, [dispatch, listKey]);

  // After create/update/delete success -> close modals and refetch
  useEffect(() => {
    if (!lastOp?.type || !lastOp?.success) return;

    // Close modals
    if (isUpsertOpen) closeUpsert();
    if (isDeleteOpen) closeDelete();

    // Refresh list
    dispatch(fetchListItems(listKey));

    // Reset flags so this effect doesn't re-trigger
    dispatch(resetListItemsFlags());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOp?.success, lastOp?.type]);

  // If backend returns an error (already toasted in saga), keep page clean; but show a small inline message if desired
  const showInlineError = !!error;

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Users" breadcrumbItem="Dynamic Lists" />

          <Row>
            <Col lg="12">
              <Card>
                <CardBody>
                  <Row className="align-items-end">
                    <Col md="6">
                      <div className="mb-3">
                        <Label className="form-label">List Type</Label>
                        <Input
                          type="select"
                          value={listKey}
                          onChange={(e) => setListKey(e.target.value)}
                        >
                          {ALLOWED_LIST_KEYS.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </Input>
                      </div>
                    </Col>
                    <Col md="6" className="text-md-end">
                      <div className="mb-3">
                        <Button color="primary" onClick={openAdd} disabled={loading}>
                          <i className="bx bx-plus me-1" />
                          Add Item
                        </Button>
                      </div>
                    </Col>
                  </Row>

                  {loading ? (
                    <div className="text-center my-4">
                      <Spinner className="me-2" />
                      Loading...
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table className="table align-middle table-nowrap mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Item Name</th>
                            <th>Key</th>
                            <th>Order</th>
                            <th>Status</th>
                            <th className="text-end">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedItems.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="text-center text-muted py-4">
                                No items found.
                              </td>
                            </tr>
                          ) : (
                            sortedItems.map((row) => {
                              const key = row?.id ?? row?._id ?? row?.ID ?? `${row?.ITEM_VALUE}-${row?.SORT_ORDER}`;
                              const active = !!row?.ACTIVE_STATUS;
                              return (
                                <tr key={key}>
                                  <td>{row?.ITEM_VALUE ?? ""}</td>
                                  <td>{row?.ITEM_KEY ?? "-"}</td>
                                  <td>{row?.SORT_ORDER ?? 0}</td>
                                  <td>
                                    {active ? (
                                      <Badge color="success" pill>
                                        Active
                                      </Badge>
                                    ) : (
                                      <Badge color="danger" pill>
                                        Inactive
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="text-end">
                                    <Button
                                      color="link"
                                      className="text-primary p-0 me-3"
                                      onClick={() => openEdit(row)}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      color="link"
                                      className="text-danger p-0"
                                      onClick={() => openDelete(row)}
                                    >
                                      Delete
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </Table>
                    </div>
                  )}

                  {showInlineError ? (
                    <div className="text-danger mt-3">
                      {String(error)}
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Create/Edit Modal */}
          <Modal isOpen={isUpsertOpen} toggle={closeUpsert} centered>
            <ModalHeader toggle={closeUpsert}>
              {editing ? "Edit Item" : "Add Item"}
            </ModalHeader>
            <Form onSubmit={onSubmitUpsert}>
              <ModalBody>
                <Row>
                  <Col md="12">
                    <div className="mb-3">
                      <Label className="form-label">List Key</Label>
                      <Input type="text" value={listKey} readOnly />
                      <div className="form-text">This is based on the selected list type.</div>
                    </div>
                  </Col>

                  <Col md="12">
                    <div className="mb-3">
                      <Label className="form-label">
                        Item Name <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="text"
                        value={form.ITEM_VALUE}
                        invalid={!!touched.ITEM_VALUE && !String(form.ITEM_VALUE || "").trim()}
                        onBlur={() => setTouched((t) => ({ ...t, ITEM_VALUE: true }))}
                        onChange={(e) => setForm((f) => ({ ...f, ITEM_VALUE: e.target.value }))}
                        placeholder="Enter item value"
                      />
                      <FormFeedback>Item Name is required</FormFeedback>
                    </div>
                  </Col>

                  <Col md="12">
                    <div className="mb-3">
                      <Label className="form-label">Key (optional)</Label>
                      <Input
                        type="text"
                        value={form.ITEM_KEY}
                        onChange={(e) => setForm((f) => ({ ...f, ITEM_KEY: e.target.value }))}
                        placeholder="Enter item key (optional)"
                      />
                    </div>
                  </Col>

                  <Col md="12">
                    <div className="mb-3">
                      <Label className="form-label">Item Order</Label>
                      <Input
                        type="number"
                        value={form.SORT_ORDER}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, SORT_ORDER: e.target.value }))
                        }
                      />
                    </div>
                  </Col>

                  <Col md="12">
                    <div className="form-check form-switch mb-2">
                      <Input
                        className="form-check-input"
                        type="checkbox"
                        id="activeStatusSwitch"
                        checked={!!form.ACTIVE_STATUS}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, ACTIVE_STATUS: e.target.checked }))
                        }
                      />
                      <Label className="form-check-label" htmlFor="activeStatusSwitch">
                        Active Status
                      </Label>
                    </div>
                  </Col>

                  {formError ? (
                    <Col md="12">
                      <div className="text-danger">{formError}</div>
                    </Col>
                  ) : null}
                </Row>
              </ModalBody>
              <ModalFooter>
                <Button color="light" type="button" onClick={closeUpsert} disabled={loading}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={loading}>
                  {loading ? <Spinner size="sm" className="me-2" /> : null}
                  {editing ? "Save" : "Create"}
                </Button>
              </ModalFooter>
            </Form>
          </Modal>

          {/* Delete Confirmation Modal */}
          <Modal isOpen={isDeleteOpen} toggle={closeDelete} centered>
            <ModalHeader toggle={closeDelete}>Confirm Delete</ModalHeader>
            <ModalBody>
              Are you sure you want to delete{" "}
              <strong>{deleting?.ITEM_VALUE ?? "this item"}</strong>?
            </ModalBody>
            <ModalFooter>
              <Button color="light" onClick={closeDelete} disabled={loading}>
                Cancel
              </Button>
              <Button color="danger" onClick={onConfirmDelete} disabled={loading}>
                {loading ? <Spinner size="sm" className="me-2" /> : null}
                Delete
              </Button>
            </ModalFooter>
          </Modal>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default DynamicListsPage;