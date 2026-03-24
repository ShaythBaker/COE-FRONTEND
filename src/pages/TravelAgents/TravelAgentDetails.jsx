// path: src/pages/TravelAgents/TravelAgentDetails.jsx
import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Col,
  Row,
  Spinner,
} from "reactstrap";

import RoleProtected from "../../components/Common/RoleProtected";
import {
  fetchTravelAgent,
  fetchTravelAgentsLookups,
} from "../../store/TravelAgents/actions";

const TravelAgentDetails = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const dispatch = useDispatch();

  const { selected, loading, lookups } = useSelector((s) => s.TravelAgents);

  useEffect(() => {
    dispatch(fetchTravelAgentsLookups());
    dispatch(fetchTravelAgent(id));
  }, [dispatch, id]);

  const countryMap = useMemo(() => {
    const map = new Map();
    (lookups?.COUNTRIES || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups?.COUNTRIES]);

  return (
    <RoleProtected allowedRoles={["COMPANY_ADMIN", "CONTRACTING", "USER"]}>
      <div className="page-content">
        <div className="container-fluid">
          <Row className="mb-3">
            <Col md={6}>
              <h4 className="mb-0">Travel Agent Details</h4>
              <div className="text-muted">{selected?._id}</div>
            </Col>
            <Col md={6} className="text-end">
              <Button
                color="secondary"
                outline
                className="me-2"
                onClick={() => nav("/travel-agents")}
              >
                Back
              </Button>
              <Button
                color="secondary"
                outline
                onClick={() => dispatch(fetchTravelAgent(id))}
              >
                Refresh
              </Button>
            </Col>
          </Row>

          {loading && !selected ? (
            <div className="text-center py-5">
              <Spinner />
            </div>
          ) : (
            <Card>
              <CardBody>
                <Row>
                  <Col md={6} className="mb-3">
                    <b>Agent Name:</b> {selected?.AGENT_NAME || "-"}
                  </Col>
                  <Col md={6} className="mb-3">
                    <b>Agent Email:</b> {selected?.AGENT_EMAIL || "-"}
                  </Col>
                  <Col md={6} className="mb-3">
                    <b>Country:</b> {countryMap.get(selected?.AGENT_COUNTRY) || "-"}
                  </Col>
                  <Col md={6} className="mb-3">
                    <b>Phone:</b> {selected?.AGENT_PHONE || "-"}
                  </Col>
                  <Col md={6} className="mb-3">
                    <b>Status:</b> {selected?.ACTIVE_STATUS ? "Active" : "Inactive"}
                  </Col>
                  <Col md={6} className="mb-3">
                    <b>Created On:</b> {selected?.CREATED_ON ? String(selected.CREATED_ON).slice(0, 10) : "-"}
                  </Col>
                </Row>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </RoleProtected>
  );
};

export default TravelAgentDetails;