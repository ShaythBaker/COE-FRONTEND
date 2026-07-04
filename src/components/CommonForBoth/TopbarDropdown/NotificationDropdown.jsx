import { useCallback, useEffect, useState } from "react"
import PropTypes from "prop-types"
import { Link } from "react-router-dom"
import { Dropdown, DropdownToggle, DropdownMenu, Row, Col, Spinner } from "reactstrap"
import SimpleBar from "simplebar-react"
import { withTranslation } from "react-i18next"
import { get, patch } from "../../../helpers/api_helper"
import {
  TASK_NOTIFICATIONS,
  TASK_NOTIFICATION_READ,
} from "../../../helpers/url_helper"
import {
  normalizeTaskNotifications,
  taskNotificationLink,
} from "../../../helpers/task_notifications"

const NotificationDropdown = props => {
  const [menu, setMenu] = useState(false)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError(false)
      const data = normalizeTaskNotifications(await get(TASK_NOTIFICATIONS))
      setItems(data.items)
      setUnreadCount(data.unreadCount)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const toggleMenu = () => {
    const opening = !menu
    setMenu(opening)
    if (opening) loadNotifications()
  }

  const markRead = async notification => {
    if (!notification?._id || notification.READ_ON) return
    setItems(current =>
      current.map(item =>
        item._id === notification._id
          ? { ...item, READ_ON: new Date().toISOString() }
          : item
      )
    )
    setUnreadCount(current => Math.max(0, current - 1))
    try {
      await patch(TASK_NOTIFICATION_READ(notification._id))
    } catch {
      loadNotifications()
    }
  }

  return (
    <Dropdown isOpen={menu} toggle={toggleMenu} className="dropdown d-inline-block" tag="li">
      <DropdownToggle
        className="btn header-item noti-icon position-relative"
        tag="button"
        id="page-header-notifications-dropdown"
      >
        <i className="bx bx-bell bx-tada" />
        {unreadCount > 0 ? (
          <span className="badge bg-danger rounded-pill">{unreadCount}</span>
        ) : null}
      </DropdownToggle>

      <DropdownMenu className="dropdown-menu dropdown-menu-lg p-0 dropdown-menu-end">
        <div className="p-3">
          <Row className="align-items-center">
            <Col><h6 className="m-0">{props.t("Notifications")}</h6></Col>
          </Row>
        </div>

        <SimpleBar style={{ height: "230px" }}>
          {loading && !items.length ? (
            <div className="text-center py-5"><Spinner size="sm" color="primary" /></div>
          ) : null}
          {loadError && !items.length ? (
            <div className="text-center text-muted p-4">Unable to load notifications.</div>
          ) : null}
          {!loading && !loadError && !items.length ? (
            <div className="text-center text-muted p-4">No notifications.</div>
          ) : null}
          {items.map(notification => (
            <Link
              key={notification._id}
              to={taskNotificationLink(notification)}
              className={`text-reset notification-item ${notification.READ_ON ? "" : "bg-light"}`}
              onClick={() => markRead(notification)}
            >
              <div className="d-flex">
                <div className="avatar-xs me-3">
                  <span className="avatar-title bg-warning rounded-circle font-size-16">
                    <i className="bx bx-task" />
                  </span>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mt-0 mb-1">Task Due Today</h6>
                  <div className="font-size-12 text-muted">
                    <p className="mb-1">{notification.MESSAGE}</p>
                    <p className="mb-0">
                      <i className="mdi mdi-calendar-clock me-1" />
                      {notification.DUE_DATE_KEY}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </SimpleBar>
      </DropdownMenu>
    </Dropdown>
  )
}

NotificationDropdown.propTypes = { t: PropTypes.func.isRequired }

export default withTranslation()(NotificationDropdown)
