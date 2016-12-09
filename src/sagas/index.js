import { combineReducers } from 'redux';
import { reducer as formReducer } from 'redux-form';

const createRootSaga = (sagas, sagaParams) => function*() {
    yield sagas.map(saga => saga(sagaParams));
};

export const sagas = createRootSaga([
    require('./initSaga').default.saga,
    require('./sessionSaga').default.saga,
    require('./sideMenuSaga').default.saga,
    require('./clinicsSaga').default.saga,
    require('./followersSaga').default.saga,
    require('./navigationSaga').default.saga
], {});

export const reducers = combineReducers({
    session: require('../sagas/sessionSaga').default.reducer,
    menu: require('./sideMenuSaga').default.reducer,
    clinics: require('./clinicsSaga').default.reducer,
    followers: require('./followersSaga').default.reducer,
    navigation: require('./navigationSaga').default.reducer,
    form: formReducer
});