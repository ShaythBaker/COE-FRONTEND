import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from "reactstrap";
import { withTranslation } from "react-i18next";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import withRouter from "../../Common/withRouter";
import { getMyProfile } from "../../../helpers/coe_backend_helper";
import { getAttachmentDownloadUrl } from "../../../helpers/attachments_helper";

const initialsFor = user => {
  const first = String(user?.FIRST_NAME || user?.firstName || "").trim().charAt(0);
  const last = String(user?.LAST_NAME || user?.lastName || "").trim().charAt(0);
  const fallback = String(user?.FULL_NAME || user?.fullName || user?.username || "U")
    .trim()
    .charAt(0);
  return `${first}${last}`.toUpperCase() || fallback.toUpperCase() || "U";
};

const readCachedUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}");
  } catch {
    return {};
  }
};

const ProfileMenu = props => {
  const [menu, setMenu] = useState(false);
  const [profile, setProfile] = useState(readCachedUser());
  const [avatarUrl, setAvatarUrl] = useState("");

  const displayName = useMemo(
    () =>
      profile?.FULL_NAME ||
      profile?.fullName ||
      profile?.username ||
      profile?.EMAIL ||
      profile?.email ||
      "User",
    [profile],
  );

  const loadProfile = useCallback(async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);

      try {
        const current = readCachedUser();
        const next = {
          ...current,
          firstName: data?.FIRST_NAME || current.firstName || null,
          lastName: data?.LAST_NAME || current.lastName || null,
          fullName: data?.FULL_NAME || current.fullName || null,
          username: data?.FULL_NAME || current.username || null,
          PROFILE_IMG_ATTACHMENT_ID:
            data?.PROFILE_IMG_ATTACHMENT_ID || current.PROFILE_IMG_ATTACHMENT_ID || null,
        };
        localStorage.setItem("authUser", JSON.stringify(next));
        localStorage.setItem("user", JSON.stringify(next));
      } catch {
        // Profile cache is optional.
      }

      if (data?.PROFILE_IMG_ATTACHMENT_ID) {
        setAvatarUrl(await getAttachmentDownloadUrl(data.PROFILE_IMG_ATTACHMENT_ID));
      } else {
        setAvatarUrl("");
      }
    } catch {
      setProfile(readCachedUser());
      setAvatarUrl("");
    }
  }, []);

  useEffect(() => {
    loadProfile();
    window.addEventListener("coe-profile-updated", loadProfile);
    return () => window.removeEventListener("coe-profile-updated", loadProfile);
  }, [loadProfile, props.success]);

  const openNotifications = event => {
    event.preventDefault();
    window.dispatchEvent(new Event("open-task-notifications"));
    setMenu(false);
  };

  return (
    <Dropdown
      isOpen={menu}
      toggle={() => setMenu(!menu)}
      className="d-inline-block"
    >
      <DropdownToggle
        className="btn header-item d-inline-flex align-items-center"
        id="page-header-user-dropdown"
        tag="button"
      >
        {avatarUrl ? (
          <img
            className="coe-header-avatar"
            src={avatarUrl}
            alt="Header Avatar"
          />
        ) : (
          <span className="coe-header-avatar coe-header-avatar-fallback bg-primary text-white">
            {initialsFor(profile)}
          </span>
        )}
        <span className="d-none d-xl-inline-block ms-2 me-1">{displayName}</span>
        <i className="mdi mdi-chevron-down d-none d-xl-inline-block" />
      </DropdownToggle>
      <DropdownMenu className="dropdown-menu-end">
        <DropdownItem tag={Link} to="/profile">
          <i className="bx bx-user font-size-16 align-middle me-1" />
          My Profile
        </DropdownItem>
        <DropdownItem tag={Link} to="/profile#change-password">
          <i className="bx bx-key font-size-16 align-middle me-1" />
          Change Password
        </DropdownItem>
        <DropdownItem href="#" onClick={openNotifications}>
          <i className="bx bx-bell font-size-16 align-middle me-1" />
          Notifications
        </DropdownItem>
        <DropdownItem tag={Link} to="/profile">
          <i className="bx bx-image font-size-16 align-middle me-1" />
          Change Profile Picture
        </DropdownItem>
        <div className="dropdown-divider" />
        <Link to="/logout" className="dropdown-item">
          <i className="bx bx-power-off font-size-16 align-middle me-1 text-danger" />
          <span>{props.t("Logout")}</span>
        </Link>
      </DropdownMenu>
    </Dropdown>
  );
};

ProfileMenu.propTypes = {
  success: PropTypes.any,
  t: PropTypes.func.isRequired,
};

const mapStatetoProps = state => {
  const { error, success } = state.Profile;
  return { error, success };
};

export default withRouter(
  connect(mapStatetoProps, {})(withTranslation()(ProfileMenu)),
);
