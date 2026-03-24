// path: src/components/VerticalLayout/SidebarContent.jsx
import PropTypes from "prop-types";
import React, { useEffect, useRef } from "react";

// Import Scrollbar
import SimpleBar from "simplebar-react";

import { useSelector } from "react-redux";

// MetisMenu
import MetisMenu from "metismenujs";
import { Link, useLocation } from "react-router-dom";
import withRouter from "../Common/withRouter";

// i18n
import { withTranslation } from "react-i18next";
import { useCallback } from "react";

import { hasAnyRole } from "../../helpers/coe_roles";

const SidebarContent = (props) => {
  const location = useLocation();
  const roles = useSelector((s) => s.Login?.roles || []);
  const canSeeSystemSettings = roles.includes("COMPANY_ADMIN");
  const canManageDynamicLists = hasAnyRole(roles, [
    "COMPANY_ADMIN",
    "CONTRACTING",
  ]);
  const canManageTransportationSizes = hasAnyRole(roles, [
    "COMPANY_ADMIN",
    "CONTRACTING",
  ]);

  const canManageHotels = hasAnyRole(roles, ["COMPANY_ADMIN", "CONTRACTING"]);

  const canManageRestaurants = hasAnyRole(roles, [
    "COMPANY_ADMIN",
    "CONTRACTING",
  ]);

  const canManageTravelAgents = hasAnyRole(roles, [
    "COMPANY_ADMIN",
    "CONTRACTING",
  ]);

  const canManageTransportationTypes = hasAnyRole(roles, [
    "COMPANY_ADMIN",
    "CONTRACTING",
  ]);

  const canManageTransportation = hasAnyRole(roles, [
    "COMPANY_ADMIN",
    "TOUR_OPERATION",
  ]);

  const canManageQuotations = hasAnyRole(roles, [
    "COMPANY_ADMIN",
    "CONTRACTING",
  ]);

  const canSeePlaces = roles.length > 0;

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const ref = useRef();
  const path = useLocation();

  const activateParentDropdown = useCallback((item) => {
    item.classList.add("active");
    const parent = item.parentElement;
    const parent2El = parent.childNodes[1];
    if (parent2El && parent2El.id !== "side-menu") {
      parent2El.classList.add("mm-show");
    }

    if (parent) {
      parent.classList.add("mm-active");
      const parent2 = parent.parentElement;

      if (parent2) {
        parent2.classList.add("mm-show");

        const parent3 = parent2.parentElement;

        if (parent3) {
          parent3.classList.add("mm-active");
          parent3.childNodes[0].classList.add("mm-active");
          const parent4 = parent3.parentElement;
          if (parent4) {
            parent4.classList.add("mm-show");
            const parent5 = parent4.parentElement;
            if (parent5) {
              parent5.classList.add("mm-show");
              parent5.childNodes[0].classList.add("mm-active");
            }
          }
        }
      }
      scrollElement(item);
      return false;
    }
    scrollElement(item);
    return false;
  }, []);

  const removeActivation = (items) => {
    for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      const parent = items[i].parentElement;

      if (item && item.classList.contains("active")) {
        item.classList.remove("active");
      }
      if (parent) {
        const parent2El =
          parent.childNodes && parent.childNodes.length && parent.childNodes[1]
            ? parent.childNodes[1]
            : null;
        if (parent2El && parent2El.id !== "side-menu") {
          parent2El.classList.remove("mm-show");
        }

        parent.classList.remove("mm-active");
        const parent2 = parent.parentElement;

        if (parent2) {
          parent2.classList.remove("mm-show");

          const parent3 = parent2.parentElement;
          if (parent3) {
            parent3.classList.remove("mm-active");
            parent3.childNodes[0].classList.remove("mm-active");

            const parent4 = parent3.parentElement;
            if (parent4) {
              parent4.classList.remove("mm-show");
              const parent5 = parent4.parentElement;
              if (parent5) {
                parent5.classList.remove("mm-show");
                parent5.childNodes[0].classList.remove("mm-active");
              }
            }
          }
        }
      }
    }
  };

  const activeMenu = useCallback(() => {
    const pathName = path.pathname;
    let matchingMenuItem = null;
    const ul = document.getElementById("side-menu");
    if (!ul) return;

    const items = ul.getElementsByTagName("a");
    removeActivation(items);

    for (let i = 0; i < items.length; ++i) {
      if (
        pathName === items[i].pathname ||
        (items[i].pathname && pathName.startsWith(`${items[i].pathname}/`))
      ) {
        matchingMenuItem = items[i];
        break;
      }
    }

    if (matchingMenuItem) {
      activateParentDropdown(matchingMenuItem);
    }
  }, [path.pathname, activateParentDropdown]);

  useEffect(() => {
    if (ref.current?.recalculate) {
      ref.current.recalculate();
    }
  }, []);

  useEffect(() => {
    const metisMenu = new MetisMenu("#side-menu");
    activeMenu();

    return () => {
      metisMenu.dispose();
    };
  }, [activeMenu]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    activeMenu();
  }, [activeMenu]);

  function scrollElement(item) {
    if (item) {
      const currentPosition = item.offsetTop;
      if (currentPosition > window.innerHeight) {
        ref.current.getScrollElement().scrollTop = currentPosition - 300;
      }
    }
  }

  return (
    <React.Fragment>
      <SimpleBar className="h-100" ref={ref}>
        <div id="sidebar-menu">
          <ul className="metismenu list-unstyled" id="side-menu">
            {canSeeSystemSettings && (
              <>
                <li className="menu-title">System Settings</li>

                <li className={isActive("/settings/users") ? "mm-active" : ""}>
                  <Link to="/settings/users" className="waves-effect">
                    <i className="bx bx-user" />
                    <span>Users</span>
                  </Link>
                </li>
              </>
            )}

            {canManageDynamicLists ? (
              <li>
                <Link
                  to="/settings/lists"
                  className={isActive("/settings/lists") ? "active" : ""}
                >
                  <i className="bx bx-list-ul" />
                  <span>Dynamic Lists</span>
                </Link>
              </li>
            ) : null}
            {canManageTransportationSizes ? (
              <li>
                <Link
                  to="/settings/transportation-sizes"
                  className={
                    isActive("/settings/transportation-sizes") ? "active" : ""
                  }
                >
                  <i className="bx bx-border-radius" />
                  <span>Transportation Sizes</span>
                </Link>
              </li>
            ) : null}

            {canManageTransportationTypes ? (
              <li>
                <Link
                  to="/settings/transportation-types"
                  className={
                    isActive("/settings/transportation-types") ? "active" : ""
                  }
                >
                  <i className="bx bx-transfer-alt" />
                  <span>Transportation Types</span>
                </Link>
              </li>
            ) : null}

            {canManageHotels ? (
              <li className={isActive("/hotels") ? "mm-active" : ""}>
                <Link to="/hotels" className="waves-effect">
                  <i className="bx bx-hotel" />
                  <span>Hotels</span>
                </Link>
              </li>
            ) : null}

            {canManageRestaurants ? (
              <li className={isActive("/restaurants") ? "mm-active" : ""}>
                <Link to="/restaurants" className="waves-effect">
                  <i className="bx bx-restaurant" />
                  <span>Restaurants</span>
                </Link>
              </li>
            ) : null}

            {canManageTravelAgents ? (
              <li className={isActive("/travel-agents") ? "mm-active" : ""}>
                <Link to="/travel-agents" className="waves-effect">
                  <i className="bx bxs-plane-alt" />
                  <span>Travel Agents</span>
                </Link>
              </li>
            ) : null}

            {canSeePlaces ? (
              <li className={isActive("/places") ? "mm-active" : ""}>
                <Link to="/places" className="waves-effect">
                  <i className="bx bxs-map" />
                  <span>Places</span>
                </Link>
              </li>
            ) : null}

            {canManageTransportation ? (
              <li
                className={
                  isActive("/transportation-companies") ? "mm-active" : ""
                }
              >
                <Link to="/transportation-companies" className="waves-effect">
                  <i className="bx bx-car" />
                  <span>Trans. Companies</span>
                </Link>
              </li>
            ) : null}

            {canManageQuotations ? (
              <li className={isActive("/quotations") ? "mm-active" : ""}>
                <Link to="/quotations" className="waves-effect">
                  <i className="bx bx-file" />
                  <span>Quotations</span>
                </Link>
              </li>
            ) : null}

            <li className="menu-title">{props.t("Menu")} </li>

            <li className="menu-title">{props.t("Apps")}</li>

            <li>
              <Link to="#" className=" ">
                <i className="bx bx-calendar"></i>
                <span>{props.t("Calendar")}</span>
              </Link>
            </li>
          </ul>
        </div>
      </SimpleBar>
    </React.Fragment>
  );
};

SidebarContent.propTypes = {
  location: PropTypes.object,
  t: PropTypes.any,
};

export default withRouter(withTranslation()(SidebarContent));
