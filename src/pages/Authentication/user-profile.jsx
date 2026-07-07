import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import { Link } from "react-router-dom";
import SimpleBar from "simplebar-react";

import Breadcrumb from "../../components/Common/Breadcrumb";
import withRouter from "../../components/Common/withRouter";
import {
  changePassword,
  getMyProfile,
  updateMyProfile,
} from "../../helpers/coe_backend_helper";
import {
  ATTACHMENT_TYPES,
  extractAttachmentErrorMessage,
  getAttachmentDownloadUrl,
  uploadAttachmentAndGetId,
} from "../../helpers/attachments_helper";
import { get, patch } from "../../helpers/api_helper";
import {
  TASK_NOTIFICATION_READ,
  TASK_NOTIFICATIONS,
} from "../../helpers/url_helper";
import {
  notificationTimeAgo,
  normalizeTaskNotifications,
  taskNotificationLink,
  taskNotificationMeta,
} from "../../helpers/task_notifications";
import { notifyError, notifySuccess } from "../../helpers/notify";

const errorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const initialsFor = user => {
  const first = String(user?.FIRST_NAME || "").trim().charAt(0);
  const last = String(user?.LAST_NAME || "").trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "U";
};

const updateStoredProfile = user => {
  try {
    const current = JSON.parse(localStorage.getItem("authUser") || "{}");
    const next = {
      ...current,
      firstName: user?.FIRST_NAME || current.firstName || null,
      lastName: user?.LAST_NAME || current.lastName || null,
      fullName: user?.FULL_NAME || current.fullName || null,
      username: user?.FULL_NAME || current.username || null,
      PROFILE_IMG_ATTACHMENT_ID:
        user?.PROFILE_IMG_ATTACHMENT_ID || current.PROFILE_IMG_ATTACHMENT_ID || null,
    };
    localStorage.setItem("authUser", JSON.stringify(next));
    localStorage.setItem("user", JSON.stringify(next));
  } catch {
    // Local storage is only a UI cache; the server remains the source of truth.
  }
};

const UserProfile = () => {
  document.title = "My Profile | COE";

  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ FIRST_NAME: "", LAST_NAME: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const rolesLabel = useMemo(
    () => (Array.isArray(profile?.ROLES) && profile.ROLES.length ? profile.ROLES.join(", ") : "-"),
    [profile],
  );

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyProfile();
      setProfile(data);
      setProfileForm({
        FIRST_NAME: data?.FIRST_NAME || "",
        LAST_NAME: data?.LAST_NAME || "",
      });
      updateStoredProfile(data);
      window.dispatchEvent(new Event("coe-profile-updated"));

      if (data?.PROFILE_IMG_ATTACHMENT_ID) {
        try {
          setAvatarUrl(await getAttachmentDownloadUrl(data.PROFILE_IMG_ATTACHMENT_ID));
        } catch {
          setAvatarUrl("");
        }
      } else {
        setAvatarUrl("");
      }
    } catch (error) {
      notifyError(errorMessage(error, "Failed to load your profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      const data = normalizeTaskNotifications(await get(TASK_NOTIFICATIONS));
      setNotifications(data.items);
    } catch {
      notifyError("Failed to load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadNotifications();
  }, [loadProfile, loadNotifications]);

  const saveProfile = async event => {
    event.preventDefault();

    if (!profileForm.FIRST_NAME.trim() || !profileForm.LAST_NAME.trim()) {
      notifyError("First name and last name are required.");
      return;
    }

    try {
      setSavingProfile(true);
      const data = await updateMyProfile({
        FIRST_NAME: profileForm.FIRST_NAME,
        LAST_NAME: profileForm.LAST_NAME,
      });
      setProfile(data);
      updateStoredProfile(data);
      window.dispatchEvent(new Event("coe-profile-updated"));
      notifySuccess("Profile updated successfully.");
    } catch (error) {
      notifyError(errorMessage(error, "Failed to update profile."));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async event => {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      notifyError("Current password and new password are required.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notifyError("New password and confirmation do not match.");
      return;
    }

    try {
      setPasswordSaving(true);
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      notifySuccess("Password changed successfully. Please login again if your session expires.");
    } catch (error) {
      notifyError(errorMessage(error, "Failed to change password."));
    } finally {
      setPasswordSaving(false);
    }
  };

  const uploadProfilePicture = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      notifyError("Please choose an image file.");
      return;
    }

    try {
      setUploadingImage(true);
      const attachmentId = await uploadAttachmentAndGetId({
        file,
        ATTACHMENT_TYPE: ATTACHMENT_TYPES.PROFILE_IMG,
        OWNER_USER_ID: profile?._id,
        META: { purpose: "profile-picture" },
      });
      const data = await updateMyProfile({
        PROFILE_IMG_ATTACHMENT_ID: attachmentId,
      });
      setProfile(data);
      updateStoredProfile(data);
      setAvatarUrl(await getAttachmentDownloadUrl(attachmentId));
      window.dispatchEvent(new Event("coe-profile-updated"));
      notifySuccess("Profile picture updated successfully.");
    } catch (error) {
      notifyError(extractAttachmentErrorMessage(error, "Failed to update profile picture."));
    } finally {
      setUploadingImage(false);
    }
  };

  const markNotificationRead = async notification => {
    if (!notification?._id || notification.READ_ON) return;
    setNotifications(current =>
      current.map(item =>
        item._id === notification._id ? { ...item, READ_ON: new Date().toISOString() } : item,
      ),
    );
    try {
      await patch(TASK_NOTIFICATION_READ(notification._id));
      window.dispatchEvent(new Event("coe-notifications-updated"));
    } catch {
      loadNotifications();
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumb title="COE" breadcrumbItem="My Profile" />

        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
          </div>
        ) : null}

        {!loading && profile ? (
          <>
            <Row>
              <Col lg={4}>
                <Card>
                  <CardBody className="text-center">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="avatar-xl rounded-circle img-thumbnail mb-3"
                      />
                    ) : (
                      <div className="avatar-xl mx-auto mb-3">
                        <span className="avatar-title rounded-circle bg-primary text-white font-size-24">
                          {initialsFor(profile)}
                        </span>
                      </div>
                    )}
                    <h5 className="mb-1">{profile.FULL_NAME || profile.EMAIL}</h5>
                    <p className="text-muted mb-2">{profile.EMAIL}</p>
                    <p className="text-muted mb-3">{rolesLabel}</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="d-none"
                      onChange={uploadProfilePicture}
                    />
                    <Button
                      color="primary"
                      outline
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingImage ? "Uploading..." : "Change Profile Picture"}
                    </Button>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <h5 className="card-title mb-3">Profile Information</h5>
                    <p className="mb-2"><strong>Name:</strong> {profile.FULL_NAME || "-"}</p>
                    <p className="mb-2"><strong>Email:</strong> {profile.EMAIL || "-"}</p>
                    <p className="mb-2"><strong>Role:</strong> {rolesLabel}</p>
                    <p className="mb-0"><strong>Company:</strong> {profile.COMPANY_NAME || profile.COMPANY_CODE || "-"}</p>
                  </CardBody>
                </Card>
              </Col>

              <Col lg={8}>
                <Card>
                  <CardBody>
                    <h5 className="card-title mb-3">Edit My Profile</h5>
                    <Form onSubmit={saveProfile}>
                      <Row>
                        <Col md={6}>
                          <div className="mb-3">
                            <Label>First Name</Label>
                            <Input
                              value={profileForm.FIRST_NAME}
                              onChange={event =>
                                setProfileForm(current => ({
                                  ...current,
                                  FIRST_NAME: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </Col>
                        <Col md={6}>
                          <div className="mb-3">
                            <Label>Last Name</Label>
                            <Input
                              value={profileForm.LAST_NAME}
                              onChange={event =>
                                setProfileForm(current => ({
                                  ...current,
                                  LAST_NAME: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </Col>
                      </Row>
                      <Button color="primary" disabled={savingProfile}>
                        {savingProfile ? "Saving..." : "Save Profile"}
                      </Button>
                    </Form>
                  </CardBody>
                </Card>

                <Card id="change-password">
                  <CardBody>
                    <h5 className="card-title mb-3">Change Password</h5>
                    <Form onSubmit={savePassword}>
                      <Row>
                        <Col md={4}>
                          <div className="mb-3">
                            <Label>Current Password</Label>
                            <Input
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={event =>
                                setPasswordForm(current => ({
                                  ...current,
                                  currentPassword: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="mb-3">
                            <Label>New Password</Label>
                            <Input
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={event =>
                                setPasswordForm(current => ({
                                  ...current,
                                  newPassword: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </Col>
                        <Col md={4}>
                          <div className="mb-3">
                            <Label>Confirm New Password</Label>
                            <Input
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={event =>
                                setPasswordForm(current => ({
                                  ...current,
                                  confirmPassword: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </Col>
                      </Row>
                      <Alert color="info" className="py-2">
                        For your security, your current password is checked on the server and the new password is stored hashed.
                      </Alert>
                      <Button color="primary" disabled={passwordSaving}>
                        {passwordSaving ? "Changing..." : "Change Password"}
                      </Button>
                    </Form>
                  </CardBody>
                </Card>

                <Card id="notifications">
                  <CardBody>
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h5 className="card-title mb-0">Notifications</h5>
                      <Button color="light" size="sm" onClick={loadNotifications}>
                        Refresh
                      </Button>
                    </div>
                    {notificationsLoading ? (
                      <div className="text-center py-4">
                        <Spinner size="sm" color="primary" />
                      </div>
                    ) : null}
                    {!notificationsLoading && !notifications.length ? (
                      <div className="text-muted text-center py-4">
                        No notifications.
                      </div>
                    ) : null}
                    <SimpleBar style={{ maxHeight: 360 }}>
                      {notifications.map(notification => {
                        const meta = taskNotificationMeta(notification);
                        return (
                          <Link
                            key={notification._id}
                            to={taskNotificationLink(notification)}
                            className={`text-reset notification-item border rounded mb-2 ${
                              notification.READ_ON ? "" : "bg-light"
                            }`}
                            onClick={() => markNotificationRead(notification)}
                          >
                            <div className="d-flex">
                              <div className="avatar-xs me-3">
                                <span className={`avatar-title bg-${meta.color} rounded-circle font-size-16`}>
                                  <i className={meta.icon} />
                                </span>
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="mt-0 mb-1">{meta.title}</h6>
                                <p className="text-muted mb-1">{notification.MESSAGE}</p>
                                <p className="text-muted font-size-12 mb-0">
                                  <i className="mdi mdi-clock-outline me-1" />
                                  {notificationTimeAgo(notification.CREATED_ON)}
                                </p>
                              </div>
                              {!notification.READ_ON ? (
                                <Button
                                  color="link"
                                  size="sm"
                                  className="p-0 ms-2 align-self-start"
                                  onClick={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    markNotificationRead(notification);
                                  }}
                                >
                                  Read
                                </Button>
                              ) : null}
                            </div>
                          </Link>
                        );
                      })}
                    </SimpleBar>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </>
        ) : null}
      </Container>
    </div>
  );
};

export default withRouter(UserProfile);
