import { all, fork } from "redux-saga/effects";

//public
// import AccountSaga from "./auth/register/saga";
import AuthSaga from "./auth/login/saga";
// import ForgetSaga from "./auth/forgetpwd/saga";
// import ProfileSaga from "./auth/profile/saga";
import LayoutSaga from "./layout/saga";

// modules
import CompanyUsersSaga from "./companyUsers/saga";

// Dynamic Lists Items
import ListItemsSaga from "./listItems/saga";
import TransportationSizesSaga from "./TransportationSizes/saga";
import TransportationTypesSaga from "./TransportationTypes/saga";


// ✅ Hotels
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



export default function* rootSaga() {
  yield all([
    //public
    // fork(AccountSaga),
    fork(AuthSaga),
    // fork(ForgetSaga),
    // fork(ProfileSaga),
    fork(LayoutSaga),
    fork(CompanyUsersSaga),
    fork(ListItemsSaga),
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
  ]);
}
