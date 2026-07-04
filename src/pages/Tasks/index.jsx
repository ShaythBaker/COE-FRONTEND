import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Nav,
  NavItem,
  NavLink,
  Row,
  Spinner,
  TabContent,
  Table,
  TabPane,
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { get, patch, post } from "../../helpers/api_helper";
import {
  ATTACHMENT_TYPES,
  openAttachment,
  uploadAttachmentAndGetId,
} from "../../helpers/attachments_helper";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { getTaskStatusMeta } from "../../helpers/task_status";
import {
  MY_TASKS,
  TASK_ASSIGNABLE_USERS,
  TASK_ATTACHMENTS,
  TASK_BY_ID,
  TASK_CLAIM,
  TASK_CLOSE,
  TASK_LOGS,
  TASK_NOTES,
  TASK_RECLAIM,
  TASK_RELATED_ITEMS,
  TASKS,
} from "../../helpers/url_helper";

const TABS = {
  CREATE: "create",
  MY: "my",
};

const RELATED_TYPE_OPTIONS = [
  { value: "HOTEL", label: "Hotels" },
  { value: "RESTAURANT", label: "Restaurants" },
  { value: "TRANSPORTATION_COMPANY", label: "Transportation Companies" },
];

const RELATED_TYPE_LABELS = {
  HOTEL: "Hotel",
  RESTAURANT: "Restaurant",
  TRANSPORTATION_COMPANY: "Transportation Company",
};

const ACTIVITY_ACTION_LABELS = {
  TASK_CREATED: "Task Created",
  TASK_CLAIMED: "Task Claimed",
  TASK_RECLAIMED: "Task Reclaimed",
  TASK_EDITED: "Task Edited",
  TASK_CLOSED: "Task Closed",
  NOTE_ADDED: "Note Added",
  ATTACHMENT_ADDED: "Attachment Added",
};

const emptyCreateForm = {
  RELATED_TYPE: "",
  RELATED_ITEM_ID: "",
  ASSIGNED_TO: "",
  NOTE: "",
  DUE_DATE: "",
};

const emptyEditForm = {
  RELATED_TYPE: "",
  RELATED_ITEM_ID: "",
  ASSIGNED_TO: "",
  NOTE: "",
  DUE_DATE: "",
};

const asArray = value => (Array.isArray(value) ? value : []);

const normalizeId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return normalizeId(value._id);
  if (value?.$oid) return value.$oid;
  return String(value);
};

const userName = user => {
  if (!user || typeof user === "string") return "-";
  const fullName = `${user.FIRST_NAME || ""} ${user.LAST_NAME || ""}`.trim();
  return fullName || user.EMAIL || "-";
};

const formatDateTime = value => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB");
};

const formatDate = value => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
};

const formatDateInput = value => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const errorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const TaskTable = ({
  tasks,
  loading,
  currentUserId,
  assignmentTaskId,
  closingTaskId,
  onView,
  onEdit,
  onLog,
  onClaim,
  onClose,
  onReclaim,
}) => {
  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner color="primary" />
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <Alert color="info" fade={false} className="mb-0">
        No tasks found.
      </Alert>
    );
  }

  return (
    <div className="table-responsive">
      <Table className="table align-middle table-nowrap mb-0">
        <thead className="table-light">
          <tr>
            <th>Related Type</th>
            <th>Related Item</th>
            <th>Assigned User</th>
            <th>Created By</th>
            <th>Created On</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => {
            const taskId = normalizeId(task?._id);
            const assignedUserId = normalizeId(task?.ASSIGNED_TO);
            const creatorUserId = normalizeId(task?.CREATED_BY);
            const previousAssignedUserId = normalizeId(
              task?.PREVIOUS_ASSIGNED_TO
            );
            const isCurrentAssignee = assignedUserId === currentUserId;
            const canReclaim =
              !isCurrentAssignee && previousAssignedUserId === currentUserId;
            const canClaim = !isCurrentAssignee && !canReclaim;
            const canEdit =
              creatorUserId === currentUserId || isCurrentAssignee;
            const assignmentLoading = assignmentTaskId === taskId;
            const status = String(task?.STATUS || "PENDING").toUpperCase();
            const statusMeta = getTaskStatusMeta(task);
            const canClose = isCurrentAssignee && status !== "CLOSED";
            const closeLoading = closingTaskId === taskId;

            return (
              <tr key={taskId}>
                <td>{RELATED_TYPE_LABELS[task?.RELATED_TYPE] || "-"}</td>
                <td>{task?.RELATED_ITEM_NAME || "-"}</td>
                <td>{userName(task?.ASSIGNED_TO)}</td>
                <td>{userName(task?.CREATED_BY)}</td>
                <td>{formatDateTime(task?.CREATED_ON)}</td>
                <td>{formatDate(task?.DUE_DATE)}</td>
                <td>
                  <Badge color={statusMeta.color}>
                    {statusMeta.label}
                  </Badge>
                </td>
                <td>
                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      color="primary"
                      size="sm"
                      onClick={() => onView(task)}
                    >
                      View
                    </Button>
                    {canEdit ? (
                      <Button
                        color="secondary"
                        size="sm"
                        onClick={() => onEdit(task)}
                      >
                        Edit
                      </Button>
                    ) : null}
                    {canClose ? (
                      <Button
                        color="danger"
                        size="sm"
                        disabled={closeLoading}
                        onClick={() => onClose(task)}
                      >
                        {closeLoading ? <Spinner size="sm" /> : "Close Task"}
                      </Button>
                    ) : null}
                    <Button
                      color="light"
                      className="border"
                      size="sm"
                      onClick={() => onLog(task)}
                    >
                      Log
                    </Button>
                    {canReclaim ? (
                      <Button
                        color="warning"
                        size="sm"
                        disabled={assignmentLoading}
                        onClick={() => onReclaim(task)}
                      >
                        {assignmentLoading ? <Spinner size="sm" /> : "Reclaim"}
                      </Button>
                    ) : null}
                    {canClaim ? (
                      <Button
                        color="success"
                        size="sm"
                        disabled={assignmentLoading}
                        onClick={() => onClaim(task)}
                      >
                        {assignmentLoading ? <Spinner size="sm" /> : "Claim"}
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

TaskTable.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.object).isRequired,
  loading: PropTypes.bool.isRequired,
  currentUserId: PropTypes.string.isRequired,
  assignmentTaskId: PropTypes.string.isRequired,
  closingTaskId: PropTypes.string.isRequired,
  onView: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onLog: PropTypes.func.isRequired,
  onClaim: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onReclaim: PropTypes.func.isRequired,
};

const TasksPage = () => {
  const currentUserId = useSelector(state => state.Login?.userId || "");
  const [searchParams] = useSearchParams();
  const linkedTaskId = searchParams.get("task") || "";

  const [activeTab, setActiveTab] = useState(TABS.CREATE);
  const [allTasks, setAllTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [allTasksLoading, setAllTasksLoading] = useState(true);
  const [myTasksLoading, setMyTasksLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [relatedItems, setRelatedItems] = useState([]);
  const [assignableUsersLoading, setAssignableUsersLoading] = useState(false);
  const [relatedItemsLoading, setRelatedItemsLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTaskId, setEditTaskId] = useState("");
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editing, setEditing] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentSaving, setAttachmentSaving] = useState(false);
  const [assignmentTaskId, setAssignmentTaskId] = useState("");
  const [closingTaskId, setClosingTaskId] = useState("");

  const [logsOpen, setLogsOpen] = useState(false);
  const [taskLogs, setTaskLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadAllTasks = useCallback(async () => {
    try {
      setAllTasksLoading(true);
      setAllTasks(asArray(await get(TASKS)));
    } catch (error) {
      notifyError(errorMessage(error, "Failed to load tasks."));
    } finally {
      setAllTasksLoading(false);
    }
  }, []);

  const loadMyTasks = useCallback(async () => {
    try {
      setMyTasksLoading(true);
      setMyTasks(asArray(await get(MY_TASKS)));
    } catch (error) {
      notifyError(errorMessage(error, "Failed to load assigned tasks."));
    } finally {
      setMyTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Tasks | Skote";
    loadAllTasks();
    loadMyTasks();
  }, [loadAllTasks, loadMyTasks]);

  useEffect(() => {
    if (!linkedTaskId) return undefined;
    let active = true;

    const loadLinkedTask = async () => {
      try {
        setDetailsOpen(true);
        setDetailsLoading(true);
        const task = await get(TASK_BY_ID(linkedTaskId));
        if (active) setSelectedTask(task);
      } catch (error) {
        if (active) {
          setDetailsOpen(false);
          notifyError(errorMessage(error, "Failed to load task details."));
        }
      } finally {
        if (active) setDetailsLoading(false);
      }
    };

    loadLinkedTask();
    return () => {
      active = false;
    };
  }, [linkedTaskId]);

  const loadAssignableUsers = async () => {
    try {
      setAssignableUsersLoading(true);
      setAssignableUsers(asArray(await get(TASK_ASSIGNABLE_USERS)));
    } catch (error) {
      notifyError(errorMessage(error, "Failed to load assignable users."));
    } finally {
      setAssignableUsersLoading(false);
    }
  };

  const loadRelatedItems = async relatedType => {
    if (!relatedType) {
      setRelatedItems([]);
      return;
    }

    try {
      setRelatedItemsLoading(true);
      setRelatedItems(asArray(await get(TASK_RELATED_ITEMS(relatedType))));
    } catch (error) {
      setRelatedItems([]);
      notifyError(errorMessage(error, "Failed to load related items."));
    } finally {
      setRelatedItemsLoading(false);
    }
  };

  const openCreateModal = () => {
    setCreateForm(emptyCreateForm);
    setRelatedItems([]);
    setCreateOpen(true);
    loadAssignableUsers();
  };

  const closeCreateModal = () => {
    if (creating) return;
    setCreateOpen(false);
    setCreateForm(emptyCreateForm);
    setRelatedItems([]);
  };

  const handleRelatedTypeChange = event => {
    const value = event.target.value;
    setCreateForm(current => ({
      ...current,
      RELATED_TYPE: value,
      RELATED_ITEM_ID: "",
    }));
    loadRelatedItems(value);
  };

  const handleCreateTask = async () => {
    if (
      !createForm.RELATED_TYPE ||
      !createForm.RELATED_ITEM_ID ||
      !createForm.ASSIGNED_TO ||
      !String(createForm.NOTE || "").trim() ||
      !createForm.DUE_DATE
    ) {
      notifyError(
        "Please select the related type, related item, assigned user, due date, and enter a note."
      );
      return;
    }

    try {
      setCreating(true);
      await post(TASKS, createForm);
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      setRelatedItems([]);
      notifySuccess("Task created successfully.");
      await Promise.all([loadAllTasks(), loadMyTasks()]);
    } catch (error) {
      notifyError(errorMessage(error, "Failed to create task."));
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = task => {
    const taskId = normalizeId(task?._id);
    if (!taskId) return;

    const relatedType = String(task?.RELATED_TYPE || "");
    setEditTaskId(taskId);
    setEditForm({
      RELATED_TYPE: relatedType,
      RELATED_ITEM_ID: normalizeId(task?.RELATED_ITEM_ID),
      ASSIGNED_TO: normalizeId(task?.ASSIGNED_TO),
      NOTE: String(asArray(task?.NOTES)[0]?.NOTE || ""),
      DUE_DATE: formatDateInput(task?.DUE_DATE),
    });
    setEditOpen(true);
    loadAssignableUsers();
    loadRelatedItems(relatedType);
  };

  const closeEditModal = () => {
    if (editing) return;
    setEditOpen(false);
    setEditTaskId("");
    setEditForm(emptyEditForm);
    setRelatedItems([]);
  };

  const handleEditRelatedTypeChange = event => {
    const value = event.target.value;
    setEditForm(current => ({
      ...current,
      RELATED_TYPE: value,
      RELATED_ITEM_ID: "",
    }));
    loadRelatedItems(value);
  };

  const handleEditTask = async () => {
    if (
      !editTaskId ||
      !editForm.RELATED_TYPE ||
      !editForm.RELATED_ITEM_ID ||
      !editForm.ASSIGNED_TO ||
      !String(editForm.NOTE || "").trim() ||
      !editForm.DUE_DATE
    ) {
      notifyError(
        "Please select the related type, related item, assigned user, due date, and enter a note."
      );
      return;
    }

    try {
      setEditing(true);
      await patch(TASK_BY_ID(editTaskId), editForm);
      setEditOpen(false);
      setEditTaskId("");
      setEditForm(emptyEditForm);
      setRelatedItems([]);
      await Promise.all([loadAllTasks(), loadMyTasks()]);
      notifySuccess("Task updated successfully.");
    } catch (error) {
      notifyError(errorMessage(error, "Failed to update task."));
    } finally {
      setEditing(false);
    }
  };

  const openTaskDetails = async task => {
    const taskId = normalizeId(task?._id);
    if (!taskId) return;

    try {
      setDetailsOpen(true);
      setDetailsLoading(true);
      setSelectedTask(await get(TASK_BY_ID(taskId)));
      setNote("");
      setAttachmentFile(null);
    } catch (error) {
      setDetailsOpen(false);
      notifyError(errorMessage(error, "Failed to load task details."));
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeTaskDetails = () => {
    if (noteSaving || attachmentSaving) return;
    setDetailsOpen(false);
    setSelectedTask(null);
    setNote("");
    setAttachmentFile(null);
  };

  const updateSelectedTask = task => {
    setSelectedTask(task);
    setAllTasks(current =>
      current.map(item =>
        normalizeId(item?._id) === normalizeId(task?._id) ? task : item
      )
    );
    setMyTasks(current =>
      current.map(item =>
        normalizeId(item?._id) === normalizeId(task?._id) ? task : item
      )
    );
  };

  const handleAddNote = async () => {
    const taskId = normalizeId(selectedTask?._id);
    const cleanNote = String(note || "").trim();
    if (!taskId || !cleanNote) return;

    try {
      setNoteSaving(true);
      await post(TASK_NOTES(taskId), { NOTE: cleanNote });
      updateSelectedTask(await get(TASK_BY_ID(taskId)));
      setNote("");
      notifySuccess("Note added successfully.");
    } catch (error) {
      notifyError(errorMessage(error, "Failed to add note."));
    } finally {
      setNoteSaving(false);
    }
  };

  const handleAddAttachment = async () => {
    const taskId = normalizeId(selectedTask?._id);
    if (!taskId || !attachmentFile) return;

    try {
      setAttachmentSaving(true);
      const attachmentId = await uploadAttachmentAndGetId({
        file: attachmentFile,
        ATTACHMENT_TYPE: ATTACHMENT_TYPES.TASK_ATTACHMENT,
        META: { module: "TASKS", taskId },
      });
      await post(TASK_ATTACHMENTS(taskId), {
        ATTACHMENT_ID: attachmentId,
      });
      updateSelectedTask(await get(TASK_BY_ID(taskId)));
      setAttachmentFile(null);
      notifySuccess("Attachment added successfully.");
    } catch (error) {
      notifyError(errorMessage(error, "Failed to add attachment."));
    } finally {
      setAttachmentSaving(false);
    }
  };

  const handleOpenAttachment = async attachment => {
    try {
      await openAttachment(normalizeId(attachment));
    } catch (error) {
      notifyError(errorMessage(error, "Failed to open attachment."));
    }
  };

  const refreshTaskLists = async () => {
    await Promise.all([loadAllTasks(), loadMyTasks()]);
  };

  const handleClaim = async task => {
    const taskId = normalizeId(task?._id);
    if (!taskId) return;

    try {
      setAssignmentTaskId(taskId);
      await post(TASK_CLAIM(taskId), {});
      await refreshTaskLists();
      notifySuccess("Task claimed successfully.");
    } catch (error) {
      notifyError(errorMessage(error, "Failed to claim task."));
    } finally {
      setAssignmentTaskId("");
    }
  };

  const handleReclaim = async task => {
    const taskId = normalizeId(task?._id);
    if (!taskId) return;

    try {
      setAssignmentTaskId(taskId);
      await post(TASK_RECLAIM(taskId), {});
      await refreshTaskLists();
      notifySuccess("Task reclaimed successfully.");
    } catch (error) {
      notifyError(errorMessage(error, "Failed to reclaim task."));
    } finally {
      setAssignmentTaskId("");
    }
  };

  const handleCloseTask = async task => {
    const taskId = normalizeId(task?._id);
    if (!taskId) return;

    try {
      setClosingTaskId(taskId);
      await post(TASK_CLOSE(taskId), {});
      await refreshTaskLists();
      notifySuccess("Task closed successfully.");
    } catch (error) {
      notifyError(errorMessage(error, "Failed to close task."));
    } finally {
      setClosingTaskId("");
    }
  };

  const openTaskLogs = async task => {
    const taskId = normalizeId(task?._id);
    if (!taskId) return;

    try {
      setLogsOpen(true);
      setLogsLoading(true);
      setTaskLogs(asArray(await get(TASK_LOGS(taskId))));
    } catch (error) {
      setLogsOpen(false);
      notifyError(errorMessage(error, "Failed to load task activity log."));
    } finally {
      setLogsLoading(false);
    }
  };

  const closeTaskLogs = () => {
    setLogsOpen(false);
    setTaskLogs([]);
  };

  const isAssignedUser =
    normalizeId(selectedTask?.ASSIGNED_TO) === String(currentUserId || "");

  return (
    <>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Operations" breadcrumbItem="Tasks" />

          <Card>
            <CardBody>
              <h4 className="card-title mb-4">Tasks</h4>

              <Nav tabs className="mb-4">
                <NavItem>
                  <NavLink
                    className={activeTab === TABS.CREATE ? "active" : ""}
                    onClick={event => {
                      event.preventDefault();
                      setActiveTab(TABS.CREATE);
                    }}
                    href="#"
                  >
                    Create Tasks
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === TABS.MY ? "active" : ""}
                    onClick={event => {
                      event.preventDefault();
                      setActiveTab(TABS.MY);
                    }}
                    href="#"
                  >
                    My Tasks
                  </NavLink>
                </NavItem>
              </Nav>

              <TabContent activeTab={activeTab}>
                <TabPane tabId={TABS.CREATE}>
                  <div className="d-flex justify-content-end mb-3">
                    <Button color="primary" onClick={openCreateModal}>
                      Create Task
                    </Button>
                  </div>
                  <TaskTable
                    tasks={allTasks}
                    loading={allTasksLoading}
                    currentUserId={String(currentUserId || "")}
                    assignmentTaskId={assignmentTaskId}
                    closingTaskId={closingTaskId}
                    onView={openTaskDetails}
                    onEdit={openEditModal}
                    onLog={openTaskLogs}
                    onClaim={handleClaim}
                    onClose={handleCloseTask}
                    onReclaim={handleReclaim}
                  />
                </TabPane>

                <TabPane tabId={TABS.MY}>
                  <TaskTable
                    tasks={myTasks}
                    loading={myTasksLoading}
                    currentUserId={String(currentUserId || "")}
                    assignmentTaskId={assignmentTaskId}
                    closingTaskId={closingTaskId}
                    onView={openTaskDetails}
                    onEdit={openEditModal}
                    onLog={openTaskLogs}
                    onClaim={handleClaim}
                    onClose={handleCloseTask}
                    onReclaim={handleReclaim}
                  />
                </TabPane>
              </TabContent>
            </CardBody>
          </Card>
        </Container>
      </div>

      <Modal isOpen={createOpen} toggle={closeCreateModal} centered>
        <ModalHeader toggle={closeCreateModal}>Create Task</ModalHeader>
        <ModalBody>
          <Row className="g-3">
            <Col xs="12">
              <Label className="form-label">Related Type</Label>
              <Input
                type="select"
                value={createForm.RELATED_TYPE}
                onChange={handleRelatedTypeChange}
              >
                <option value="">Select related type</option>
                {RELATED_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Input>
            </Col>

            <Col xs="12">
              <Label className="form-label">Related Item</Label>
              <Input
                type="select"
                value={createForm.RELATED_ITEM_ID}
                disabled={!createForm.RELATED_TYPE || relatedItemsLoading}
                onChange={event =>
                  setCreateForm(current => ({
                    ...current,
                    RELATED_ITEM_ID: event.target.value,
                  }))
                }
              >
                <option value="">
                  {relatedItemsLoading ? "Loading..." : "Select related item"}
                </option>
                {relatedItems.map(item => (
                  <option key={normalizeId(item?._id)} value={normalizeId(item?._id)}>
                    {item?.NAME || "-"}
                  </option>
                ))}
              </Input>
            </Col>

            <Col xs="12">
              <Label className="form-label">Assigned User</Label>
              <Input
                type="select"
                value={createForm.ASSIGNED_TO}
                disabled={assignableUsersLoading}
                onChange={event =>
                  setCreateForm(current => ({
                    ...current,
                    ASSIGNED_TO: event.target.value,
                  }))
                }
              >
                <option value="">
                  {assignableUsersLoading ? "Loading..." : "Select assigned user"}
                </option>
                {assignableUsers.map(user => (
                  <option key={normalizeId(user?._id)} value={normalizeId(user?._id)}>
                    {userName(user)}
                  </option>
                ))}
              </Input>
            </Col>

            <Col xs="12">
              <Label className="form-label">Note</Label>
              <Input
                type="textarea"
                rows="4"
                placeholder="Write task instructions..."
                value={createForm.NOTE}
                required
                onChange={event =>
                  setCreateForm(current => ({
                    ...current,
                    NOTE: event.target.value,
                  }))
                }
              />
            </Col>

            <Col xs="12">
              <Label className="form-label">Due Date</Label>
              <Input
                type="date"
                value={createForm.DUE_DATE}
                required
                onChange={event =>
                  setCreateForm(current => ({
                    ...current,
                    DUE_DATE: event.target.value,
                  }))
                }
              />
            </Col>

          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={closeCreateModal} disabled={creating}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleCreateTask} disabled={creating}>
            {creating ? <Spinner size="sm" /> : "Create Task"}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={editOpen} toggle={closeEditModal} centered>
        <ModalHeader toggle={closeEditModal}>Edit Task</ModalHeader>
        <ModalBody>
          <Row className="g-3">
            <Col xs="12">
              <Label className="form-label">Related Type</Label>
              <Input
                type="select"
                value={editForm.RELATED_TYPE}
                onChange={handleEditRelatedTypeChange}
              >
                <option value="">Select related type</option>
                {RELATED_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Input>
            </Col>

            <Col xs="12">
              <Label className="form-label">Related Item</Label>
              <Input
                type="select"
                value={editForm.RELATED_ITEM_ID}
                disabled={!editForm.RELATED_TYPE || relatedItemsLoading}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    RELATED_ITEM_ID: event.target.value,
                  }))
                }
              >
                <option value="">
                  {relatedItemsLoading ? "Loading..." : "Select related item"}
                </option>
                {relatedItems.map(item => (
                  <option key={normalizeId(item?._id)} value={normalizeId(item?._id)}>
                    {item?.NAME || "-"}
                  </option>
                ))}
              </Input>
            </Col>

            <Col xs="12">
              <Label className="form-label">Assigned User</Label>
              <Input
                type="select"
                value={editForm.ASSIGNED_TO}
                disabled={assignableUsersLoading}
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    ASSIGNED_TO: event.target.value,
                  }))
                }
              >
                <option value="">
                  {assignableUsersLoading ? "Loading..." : "Select assigned user"}
                </option>
                {assignableUsers.map(user => (
                  <option key={normalizeId(user?._id)} value={normalizeId(user?._id)}>
                    {userName(user)}
                  </option>
                ))}
              </Input>
            </Col>

            <Col xs="12">
              <Label className="form-label">Note</Label>
              <Input
                type="textarea"
                rows="4"
                placeholder="Write task instructions..."
                value={editForm.NOTE}
                required
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    NOTE: event.target.value,
                  }))
                }
              />
            </Col>

            <Col xs="12">
              <Label className="form-label">Due Date</Label>
              <Input
                type="date"
                value={editForm.DUE_DATE}
                required
                onChange={event =>
                  setEditForm(current => ({
                    ...current,
                    DUE_DATE: event.target.value,
                  }))
                }
              />
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={closeEditModal} disabled={editing}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleEditTask} disabled={editing}>
            {editing ? <Spinner size="sm" /> : "Save"}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={detailsOpen}
        toggle={closeTaskDetails}
        size="lg"
        centered
        scrollable
      >
        <ModalHeader toggle={closeTaskDetails}>Task Details</ModalHeader>
        <ModalBody>
          {detailsLoading || !selectedTask ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
            </div>
          ) : (
            <>
              <Table bordered responsive>
                <tbody>
                  <tr>
                    <th>Related Type</th>
                    <td>{RELATED_TYPE_LABELS[selectedTask.RELATED_TYPE] || "-"}</td>
                  </tr>
                  <tr>
                    <th>Related Item</th>
                    <td>{selectedTask.RELATED_ITEM_NAME || "-"}</td>
                  </tr>
                  <tr>
                    <th>Assigned User</th>
                    <td>{userName(selectedTask.ASSIGNED_TO)}</td>
                  </tr>
                  <tr>
                    <th>Created By</th>
                    <td>{userName(selectedTask.CREATED_BY)}</td>
                  </tr>
                  <tr>
                    <th>Created Date</th>
                    <td>{formatDateTime(selectedTask.CREATED_ON)}</td>
                  </tr>
                  <tr>
                    <th>Due Date</th>
                    <td>{formatDate(selectedTask.DUE_DATE)}</td>
                  </tr>
                  <tr>
                    <th>Status</th>
                    <td>
                      <Badge color={getTaskStatusMeta(selectedTask).color}>
                        {getTaskStatusMeta(selectedTask).label}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </Table>

              <h5 className="mt-4">Existing Notes</h5>
              {asArray(selectedTask.NOTES).length ? (
                <div className="mb-3">
                  {asArray(selectedTask.NOTES).map(taskNote => (
                    <Card key={normalizeId(taskNote?._id)} className="mb-2 border">
                      <CardBody className="py-2">
                        <div>{taskNote?.NOTE || "-"}</div>
                        <small className="text-muted">
                          {userName(taskNote?.CREATED_BY)} · {formatDateTime(taskNote?.CREATED_ON)}
                        </small>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No notes added.</p>
              )}

              <h5 className="mt-4">Existing Images / Attachments</h5>
              {asArray(selectedTask.ATTACHMENT_IDS).length ? (
                <div className="d-flex flex-column gap-2 mb-3">
                  {asArray(selectedTask.ATTACHMENT_IDS).map(attachment => (
                    <div
                      key={normalizeId(attachment)}
                      className="d-flex align-items-center justify-content-between border rounded p-2"
                    >
                      <span>{attachment?.FILE_NAME || "Attachment"}</span>
                      <Button
                        color="light"
                        className="border"
                        size="sm"
                        onClick={() => handleOpenAttachment(attachment)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">No images or attachments added.</p>
              )}

              {isAssignedUser ? (
                <Row className="g-3 mt-2">
                  <Col md="7">
                    <Label className="form-label">Note</Label>
                    <Input
                      type="textarea"
                      rows="3"
                      value={note}
                      onChange={event => setNote(event.target.value)}
                    />
                    <Button
                      color="primary"
                      className="mt-2"
                      onClick={handleAddNote}
                      disabled={noteSaving || !String(note || "").trim()}
                    >
                      {noteSaving ? <Spinner size="sm" /> : "Add Note"}
                    </Button>
                  </Col>
                  <Col md="5">
                    <Label className="form-label">Image / Attachment</Label>
                    <Input
                      type="file"
                      onChange={event => setAttachmentFile(event.target.files?.[0] || null)}
                    />
                    <Button
                      color="primary"
                      className="mt-2"
                      onClick={handleAddAttachment}
                      disabled={attachmentSaving || !attachmentFile}
                    >
                      {attachmentSaving ? <Spinner size="sm" /> : "Add Attachment"}
                    </Button>
                  </Col>
                </Row>
              ) : null}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={closeTaskDetails}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={logsOpen} toggle={closeTaskLogs} size="lg" centered>
        <ModalHeader toggle={closeTaskLogs}>Task Activity Log</ModalHeader>
        <ModalBody>
          {logsLoading ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
            </div>
          ) : taskLogs.length ? (
            <div className="table-responsive">
              <Table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Action</th>
                    <th>User</th>
                    <th>Date / Time</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {taskLogs.map(log => (
                    <tr
                      key={
                        normalizeId(log?._id) ||
                        `${log?.ACTION_TYPE}-${log?.CREATED_ON}`
                      }
                    >
                      <td>
                        {ACTIVITY_ACTION_LABELS[log?.ACTION_TYPE] ||
                          log?.ACTION_TYPE ||
                          "-"}
                      </td>
                      <td>{userName(log?.PERFORMED_BY)}</td>
                      <td>{formatDateTime(log?.CREATED_ON)}</td>
                      <td>{log?.DESCRIPTION || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <Alert color="info" fade={false} className="mb-0">
              No activity log found.
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={closeTaskLogs}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default TasksPage;
