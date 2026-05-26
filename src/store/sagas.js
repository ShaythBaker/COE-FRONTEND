// path: src/store/sagas.js
import { all, fork } from "redux-saga/effects";

// public
import AuthSaga from "./auth/login/saga";
import LayoutSaga from "./layout/saga";

// modules
import CompanyUsersSaga from "./companyUsers/saga";
import ListItemsSaga from "./listItems/saga";
import TransportationSizesSaga from "./TransportationSizes/saga";
import TransportationTypesSaga from "./TransportationTypes/saga";
import HotelsSaga from "./Hotels/saga";
import RestaurantsSaga from "./Restaurants/saga";
import TravelAgentsSaga from "./TravelAgents/saga";
import PlacesSaga from "./Places/saga";
import TransportationCompaniesSaga from "./TransportationCompanies/saga";
import QuotationsSaga from "./Quotations/saga";
import QuotationDaysSaga from "./QuotationDays/saga";
import quotationAccumidationSaga from "./QuotationAccumidation/saga";
import ExtraServicesSaga from "./ExtraServices/saga";
import QuotationExtraServicesSaga from "./QuotationExtraServices/saga";
import quotationPricingSaga from "./QuotationPricing/saga";
<<<<<<< HEAD
import reservationFilesSaga from "./ReservationFiles/saga";
=======
import GuidesSaga from "./Guides/saga";
>>>>>>> DEV-FE

export default function* rootSaga() {
  yield all([
    fork(AuthSaga),
    fork(LayoutSaga),
    fork(CompanyUsersSaga),
    fork(ListItemsSaga),
    fork(GuidesSaga),
    fork(HotelsSaga),
    fork(RestaurantsSaga),
    fork(TravelAgentsSaga),
    fork(PlacesSaga),
    fork(TransportationSizesSaga),
    fork(TransportationTypesSaga),
    fork(TransportationCompaniesSaga),
    fork(QuotationsSaga),
    fork(QuotationDaysSaga),
    fork(quotationAccumidationSaga),
    fork(ExtraServicesSaga),
    fork(QuotationExtraServicesSaga),
    fork(quotationPricingSaga),
    fork(reservationFilesSaga),
  ]);
}
