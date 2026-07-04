import { useCallback, useEffect, useState } from "react"
import PropTypes from "prop-types"
import { Link } from "react-router-dom"
import {
  Button,
  Col,
  Dropdown,
  DropdownMenu,
  DropdownToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
} from "reactstrap"
import SimpleBar from "simplebar-react"
import { withTranslation } from "react-i18next"
import { get, patch } from "../../../helpers/api_helper"
import {
  TASK_NOTIFICATIONS,
  TASK_NOTIFICATION_READ,
  TASK_NOTIFICATIONS_READ_ALL,
} from "../../../helpers/url_helper"
import {
  notificationTimeAgo,
  normalizeTaskNotifications,
  taskNotificationLink,
  taskNotificationMeta,
  subscribeToNotificationRefresh,
} from "../../../helpers/task_notifications"

const NotificationDropdown = props => {
  const [menu, setMenu] = useState(false)
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [allOpen, setAllOpen] = useState(false)

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
    return subscribeToNotificationRefresh(loadNotifications)
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

  const markAllRead = async () => {
    if (!unreadCount) return

    const readOn = new Date().toISOString()
    setItems(current =>
      current.map(item => (item.READ_ON ? item : { ...item, READ_ON: readOn }))
    )
    setUnreadCount(0)

    try {
      await patch(TASK_NOTIFICATIONS_READ_ALL)
    } catch {
      loadNotifications()
    }
  }

  const openAllNotifications = () => {
    setAllOpen(true)
    loadNotifications()
  }

  return (
    <>
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
            <Col className="text-end">
              <Button
                color="link"
                size="sm"
                className="p-0"
                disabled={!unreadCount}
                onClick={markAllRead}
              >
                Mark all as read
              </Button>
            </Col>
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
          {items.slice(0, 5).map(notification => {
            const meta = taskNotificationMeta(notification)
            return (
              <Link
              key={notification._id}
              to={taskNotificationLink(notification)}
              className={`text-reset notification-item ${notification.READ_ON ? "" : "bg-light"}`}
              onClick={() => markRead(notification)}
            >
              <div className="d-flex">
                <div className="avatar-xs me-3">
                  <span className={`avatar-title bg-${meta.color} rounded-circle font-size-16`}>
                    <i className={meta.icon} />
                  </span>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mt-0 mb-1">{meta.title}</h6>
                  <div className="font-size-12 text-muted">
                    <p className="mb-1">{notification.MESSAGE}</p>
                    {meta.showDate ? (
                      <p className="mb-0">
                        <i className="mdi mdi-calendar-clock me-1" />
                        {notification.DUE_DATE_KEY}
                      </p>
                    ) : null}
                    <p className="mb-0">
                      <i className="mdi mdi-clock-outline me-1" />
                      {notificationTimeAgo(notification.CREATED_ON)}
                    </p>
                  </div>
                </div>
                {!notification.READ_ON ? (
                  <Button
                    color="link"
                    size="sm"
                    className="p-0 ms-2 align-self-start"
                    onClick={event => {
                      event.preventDefault()
                      event.stopPropagation()
                      markRead(notification)
                    }}
                  >
                    Read
                  </Button>
                ) : null}
              </div>
              </Link>
            )
          })}
        </SimpleBar>
        <div className="p-2 border-top d-grid">
          <Button color="primary" size="sm" onClick={openAllNotifications}>
            View all notifications
          </Button>
        </div>
      </DropdownMenu>
    </Dropdown>

    <Modal isOpen={allOpen} toggle={() => setAllOpen(false)} size="lg" centered scrollable>
      <ModalHeader toggle={() => setAllOpen(false)}>Notifications</ModalHeader>
      <ModalBody className="p-0">
        {loading && !items.length ? (
          <div className="text-center py-5"><Spinner size="sm" color="primary" /></div>
        ) : null}
        {loadError && !items.length ? (
          <div className="text-center text-muted p-4">Unable to load notifications.</div>
        ) : null}
        {!loading && !loadError && !items.length ? (
          <div className="text-center text-muted p-4">No notifications.</div>
        ) : null}
        {items.map(notification => {
          const meta = taskNotificationMeta(notification)
          return (
            <Link
              key={notification._id}
              to={taskNotificationLink(notification)}
              className={`text-reset notification-item border-bottom ${notification.READ_ON ? "" : "bg-light"}`}
              onClick={() => {
                markRead(notification)
                setAllOpen(false)
              }}
            >
              <div className="d-flex">
                <div className="avatar-xs me-3">
                  <span className={`avatar-title bg-${meta.color} rounded-circle font-size-16`}>
                    <i className={meta.icon} />
                  </span>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mt-0 mb-1">{meta.title}</h6>
                  <div className="font-size-12 text-muted">
                    <p className="mb-1">{notification.MESSAGE}</p>
                    {meta.showDate ? (
                      <p className="mb-1">
                        <i className="mdi mdi-calendar-clock me-1" />
                        {notification.DUE_DATE_KEY}
                      </p>
                    ) : null}
                    <p className="mb-0">
                      <i className="mdi mdi-clock-outline me-1" />
                      {notificationTimeAgo(notification.CREATED_ON)}
                    </p>
                  </div>
                </div>
                {!notification.READ_ON ? (
                  <Button
                    color="link"
                    size="sm"
                    className="p-0 ms-2 align-self-start"
                    onClick={event => {
                      event.preventDefault()
                      event.stopPropagation()
                      markRead(notification)
                    }}
                  >
                    Read
                  </Button>
                ) : null}
              </div>
            </Link>
          )
        })}
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={() => setAllOpen(false)}>Close</Button>
      </ModalFooter>
    </Modal>
    </>
  )
}

NotificationDropdown.propTypes = { t: PropTypes.func.isRequired }

export default withTranslation()(NotificationDropdown)
