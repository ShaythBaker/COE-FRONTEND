import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
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
import { del, get, patch, post } from "../../helpers/api_helper";
import { getListItems } from "../../helpers/coe_backend_helper";
import { notifyError, notifySuccess } from "../../helpers/notify";
import {
  HOTEL_SPECIAL_RATE_BY_ID,
  HOTEL_SPECIAL_RATES,
  HOTEL_SEASON_RATES,
  TRAVEL_AGENTS,
} from "../../helpers/url_helper";

const emptyForm = {
  TRAVEL_AGENT_ID: "",
  SEASON_NAME: "",
  ROOM_TYPE_ID: "",
  START_DATE: "",
  END_DATE: "",
  BB_RATE_AMOUNT: "",
  HB_RATE_AMOUNT: "",
  FB_RATE_AMOUNT: "",
  SINGLE_SUPPLIMENT_AMOUNT: "",
};

const idOf = value => String(value?._id || value || "");
const dateOnly = value => (value ? String(value).slice(0, 10) : "");
const labelOf = value => value?.ITEM_VALUE || value?.AGENT_NAME || "-";
const asArray = value => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const errorMessage = error => {
  const details = error?.response?.data?.errors;
  if (Array.isArray(details) && details.length) return details.join(". ");
  return error?.response?.data?.message || error?.message || "Request failed";
};

const SpecialRatesTab = ({ hotelId, canMutate }) => {
  const [items, setItems] = useState([]);
  const [agents, setAgents] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [seasonRates, setSeasonRates] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [touched, setTouched] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [specialRates, agentRows, seasonItems, seasonRows, roomTypeRows] = await Promise.all([
        get(HOTEL_SPECIAL_RATES(hotelId)),
        get(TRAVEL_AGENTS),
        getListItems("HOTELSEASONS"),
        get(HOTEL_SEASON_RATES(hotelId)),
        getListItems("ROOM_TYPES"),
      ]);
      setItems(asArray(specialRates));
      setAgents(asArray(agentRows));
      setSeasons(asArray(seasonItems));
      setSeasonRates(asArray(seasonRows));
      setRoomTypes(asArray(roomTypeRows));
    } catch (error) {
      notifyError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  const compatibleSeasonRates = useMemo(
    () =>
      seasonRates.filter(rate => {
        const seasonRoomTypeId = idOf(rate.ROOM_TYPE_ID);
        return (
          idOf(rate.SEASON_NAME) === form.SEASON_NAME &&
          (!form.ROOM_TYPE_ID || !seasonRoomTypeId || seasonRoomTypeId === form.ROOM_TYPE_ID)
        );
      }),
    [form.ROOM_TYPE_ID, form.SEASON_NAME, seasonRates]
  );

  const errors = useMemo(() => {
    const next = {};
    ["TRAVEL_AGENT_ID", "SEASON_NAME", "ROOM_TYPE_ID", "START_DATE", "END_DATE"].forEach(
      key => {
        if (!form[key]) next[key] = "Required";
      }
    );
    ["BB_RATE_AMOUNT", "HB_RATE_AMOUNT", "FB_RATE_AMOUNT", "SINGLE_SUPPLIMENT_AMOUNT"].forEach(key => {
      if (form[key] === "" || !Number.isFinite(Number(form[key])) || Number(form[key]) < 0) {
        next[key] = "Enter a non-negative number";
      }
    });
    if (form.START_DATE && form.END_DATE && form.START_DATE > form.END_DATE) {
      next.END_DATE = "End Date must be on or after Start Date";
    }
    if (
      compatibleSeasonRates.length > 0 &&
      form.SEASON_NAME &&
      form.ROOM_TYPE_ID &&
      form.START_DATE &&
      form.END_DATE
    ) {
      const containingRate = compatibleSeasonRates.some(
        rate =>
          form.START_DATE >= dateOnly(rate.START_DATE) &&
          form.END_DATE <= dateOnly(rate.END_DATE)
      );
      if (!containingRate) {
        next.END_DATE = "Dates must be inside this hotel's selected Season Rate";
      }
    }
    return next;
  }, [compatibleSeasonRates, form]);

  const openCreate = () => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setEditing(null);
    setTouched({});
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = rate => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setEditing(rate);
    setTouched({});
    setForm({
      TRAVEL_AGENT_ID: idOf(rate.TRAVEL_AGENT_ID),
      SEASON_NAME: idOf(rate.SEASON_NAME),
      ROOM_TYPE_ID: idOf(rate.ROOM_TYPE_ID),
      START_DATE: dateOnly(rate.START_DATE),
      END_DATE: dateOnly(rate.END_DATE),
      BB_RATE_AMOUNT: rate.BB_RATE_AMOUNT ?? "",
      HB_RATE_AMOUNT: rate.HB_RATE_AMOUNT ?? "",
      FB_RATE_AMOUNT: rate.FB_RATE_AMOUNT ?? "",
      SINGLE_SUPPLIMENT_AMOUNT: rate.SINGLE_SUPPLIMENT_AMOUNT ?? "",
    });
    setModalOpen(true);
  };

  const change = (key, value) => {
    setForm(current => {
      return { ...current, [key]: value };
    });
  };

  const submit = async event => {
    event.preventDefault();
    setTouched(Object.keys(emptyForm).reduce((all, key) => ({ ...all, [key]: true }), {}));
    if (Object.keys(errors).length) return notifyError("Please correct the highlighted fields");
    setSaving(true);
    try {
      if (editing) {
        await patch(HOTEL_SPECIAL_RATE_BY_ID(hotelId, editing._id), form);
        notifySuccess("Special Rate updated");
      } else {
        await post(HOTEL_SPECIAL_RATES(hotelId), form);
        notifySuccess("Special Rate created");
      }
      setModalOpen(false);
      await load();
    } catch (error) {
      notifyError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      await del(HOTEL_SPECIAL_RATE_BY_ID(hotelId, deleting._id));
      notifySuccess("Special Rate deleted");
      setDeleting(null);
      await load();
    } catch (error) {
      notifyError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, type = "number", width = 3) => (
    <Col md={width} className="mb-3">
      <Label>{label} *</Label>
      <Input
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={form[key]}
        invalid={Boolean(touched[key] && errors[key])}
        onBlur={() => setTouched(current => ({ ...current, [key]: true }))}
        onChange={event => change(key, event.target.value)}
      />
      <FormFeedback>{errors[key]}</FormFeedback>
    </Col>
  );

  return (
    <>
      <Card>
        <CardBody>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-1">Special Rates</h5>
              <div className="text-muted">Travel-agent rates take priority over season rates.</div>
            </div>
            <Button
              color="primary"
              onClick={openCreate}
              disabled={!canMutate}
              data-testid="create-special-rate-button"
            >
              <i className="bx bx-plus me-1" /> Create Special Rate
            </Button>
          </div>
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : items.length === 0 ? (
            <div className="text-center text-muted py-5">No special rates found.</div>
          ) : (
            <div className="table-responsive">
              <Table className="table align-middle table-nowrap mb-0">
                <thead className="table-light"><tr>
                  <th>Travel Agent</th><th>Season</th><th>Room Type</th><th>Start</th><th>End</th>
                  <th>BB</th><th>HB</th><th>FB</th><th>Single Supp.</th>
                  <th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>{items.map(rate => <tr key={rate._id}>
                  <td>{labelOf(rate.TRAVEL_AGENT_ID)}</td>
                  <td>{labelOf(rate.SEASON_NAME)}</td>
                  <td>{labelOf(rate.ROOM_TYPE_ID)}</td>
                  <td>{dateOnly(rate.START_DATE)}</td><td>{dateOnly(rate.END_DATE)}</td>
                  <td>{rate.BB_RATE_AMOUNT}</td><td>{rate.HB_RATE_AMOUNT}</td><td>{rate.FB_RATE_AMOUNT}</td>
                  <td>{rate.SINGLE_SUPPLIMENT_AMOUNT}</td>
                  <td>
                    <Badge color={rate.ACTIVE_STATUS === false ? "secondary" : "success"} pill>
                      {rate.ACTIVE_STATUS === false ? "Inactive" : "Active"}
                    </Badge>
                  </td>
                  <td><Button color="link" className="p-0 me-2" onClick={() => openEdit(rate)}>Edit</Button>
                    <Button color="link" className="text-danger p-0" onClick={() => setDeleting(rate)}>Delete</Button></td>
                </tr>)}</tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        isOpen={modalOpen}
        toggle={() => setModalOpen(false)}
        size="lg"
        centered
        data-testid="special-rate-modal"
      >
        <ModalHeader toggle={() => setModalOpen(false)}>{editing ? "Edit" : "Create"} Special Rate</ModalHeader>
        <Form onSubmit={submit}><ModalBody><Row>
          <Col md={6} className="mb-3"><Label>Travel Agent *</Label><Input type="select" value={form.TRAVEL_AGENT_ID}
            invalid={Boolean(touched.TRAVEL_AGENT_ID && errors.TRAVEL_AGENT_ID)} onChange={e => change("TRAVEL_AGENT_ID", e.target.value)}>
            <option value="">Select...</option>{agents.map(agent => <option key={agent._id} value={agent._id}>{agent.AGENT_NAME}</option>)}</Input>
            <FormFeedback>{errors.TRAVEL_AGENT_ID}</FormFeedback></Col>
          <Col md={6} className="mb-3"><Label>Season *</Label><Input type="select" data-testid="special-rate-season-select" data-source-count={seasons.length} value={form.SEASON_NAME}
            invalid={Boolean(touched.SEASON_NAME && errors.SEASON_NAME)} onChange={e => change("SEASON_NAME", e.target.value)}>
            <option value="">Select...</option>{seasons.map(season => <option key={season._id} value={season._id}>
              {season.ITEM_VALUE}
            </option>)}</Input><FormFeedback>{errors.SEASON_NAME}</FormFeedback></Col>
          <Col md={6} className="mb-3"><Label>Room Type *</Label><Input type="select" value={form.ROOM_TYPE_ID}
            invalid={Boolean(touched.ROOM_TYPE_ID && errors.ROOM_TYPE_ID)} onChange={e => change("ROOM_TYPE_ID", e.target.value)}>
            <option value="">Select...</option>{roomTypes.map(item => <option key={item._id} value={item._id}>{item.ITEM_VALUE}</option>)}</Input>
            <FormFeedback>{errors.ROOM_TYPE_ID}</FormFeedback></Col>
          {field("START_DATE", "Start Date", "date", 6)}{field("END_DATE", "End Date", "date", 6)}
          {field("BB_RATE_AMOUNT", "BB")}{field("HB_RATE_AMOUNT", "HB")}
          {field("FB_RATE_AMOUNT", "FB")}{field("SINGLE_SUPPLIMENT_AMOUNT", "Single Supplement")}
        </Row></ModalBody><ModalFooter>
          <Button color="light" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button color="primary" type="submit" disabled={saving}>{saving ? <Spinner size="sm" className="me-2" /> : null}Save</Button>
        </ModalFooter></Form>
      </Modal>

      <Modal isOpen={Boolean(deleting)} toggle={() => setDeleting(null)} centered>
        <ModalHeader toggle={() => setDeleting(null)}>Confirm Delete</ModalHeader>
        <ModalBody>Delete this Special Rate for <b>{labelOf(deleting?.TRAVEL_AGENT_ID)}</b>?</ModalBody>
        <ModalFooter><Button color="light" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button color="danger" onClick={confirmDelete} disabled={saving}>Delete</Button></ModalFooter>
      </Modal>
    </>
  );
};

SpecialRatesTab.propTypes = {
  hotelId: PropTypes.string.isRequired,
  canMutate: PropTypes.bool.isRequired,
};

export default SpecialRatesTab;
