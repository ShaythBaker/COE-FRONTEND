// path: src/pages/Authentication/NotAuthorized.jsx
import React from "react";
import { Container, Row, Col, Card, CardBody, Button } from "reactstrap";
import { Link } from "react-router-dom";

const NotAuthorized = () => {
  document.title = "Not Authorized | COE";

  return (
    <div className="account-pages my-5 pt-sm-5">
      <Container>
        <Row className="justify-content-center">
          <Col md="8" lg="6" xl="5">
            <Card className="overflow-hidden">
              <CardBody className="pt-4">
                <div className="text-center p-3">
                  <h4 className="text-danger">Not Authorized</h4>
                  <p className="text-muted mb-4">
                    You don’t have permission to access this page.
                  </p>

                  <Button tag={Link} to="/dashboard" color="primary">
                    Back to Dashboard
                  </Button>
                </div>
              </CardBody>
            </Card>
            <div className="mt-5 text-center">
              <p className="mb-0">
                © {new Date().getFullYear()} COE
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default NotAuthorized;