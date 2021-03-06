import _ from 'lodash';
import SagaReducerFactory from '../saga-reducers-factory-patch';
import { put, call, select, delay } from 'redux-saga/effects';
import { actions, types } from '../actions/sessionActions';
import formErrorAction from '../actions/formError';
import * as sessionApi from '../api/session';
import {actions as navigationActions} from '../actions/navigationActions';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from "../push";

let {handle, updateState, saga, reducer} = SagaReducerFactory({
    actionTypes: types,
    actionCreators: actions,
    initState: {
        user: null,
        loggedIn: false
    }
});

handle(types.RESUME, function*() {
    try {
        const user = yield call(sessionApi.get);
        const loggedIn = yield updateUser(user);
        const currentPath = location.pathname;
        const excludedRedirect = [ // Need this to keep the query params (Google auth errors)
            '/login',
            '/loginLeader'
        ];

        if (!loggedIn && !excludedRedirect.includes(currentPath))
            yield put(navigationActions.navigate((currentPath === '/followers') ? 'loginLeader' : 'login'));
    } catch (err) {
        console.log('resuming session failed', err);
        yield put(navigationActions.navigate('login'));
    }
});

handle(types.LOGIN, function*(sagaParams, action) {
    let {email, password, isLeader} = action.payload;

    let user;

    try {
        user = yield call(sessionApi.create, email, password, isLeader);
    } catch (err) {
        console.warn('login failed', err);
    }
    let {auth_token} = user;

    saveAuthToken(auth_token);

    user = _.omit(user, 'auth_token');

    let loggedIn = yield updateUser(user);

    if (!loggedIn)
        yield put(formErrorAction('login'));
});

handle(types.LOGOUT, function*() {
    try {
        let user = yield call(sessionApi.get);
        yield call(unsubscribeFromPushNotifications);
        yield call(sessionApi.logout);
        yield put(updateState({
            loggedIn: false
        }));
        yield put(navigationActions.navigate(user.isLeader ? 'logoutLeader' : 'logout'));
    } catch (err) {
        console.warn('logout failed', err);
    }
});

handle(types.REGISTER, function*(sagaParams, {payload}) {
    try {
        yield put(updateState({ registrationFailed: false }));
        let user = yield call(sessionApi.register, payload.email, payload.name, payload.password, payload.isLeader);
        yield updateUser(user);
        yield put(navigationActions.hideModal());
    } catch (err) {
        console.error('registration failed', err);
        yield put(updateState({ registrationFailed: true }));
    }
});

handle(types.GOOGLE_LOGIN, function*(sagaParams, {payload}) {
    try {
        const {url} = yield call(sessionApi.startGoogleLogin, payload.isLeader);
        location.href = url;
    } catch (err) {
        console.error('google login failed', err);
    }
});

handle(types.RECOVER_PASSWORD, function*(sagaParams, {payload}) {
    try {
        yield put(updateState({ forgotPasswordSpinner: true, forgotPasswordFailed: false }));
        yield call(sessionApi.recoverPassword, payload.email);
        yield put(navigationActions.hideModal());
        yield put(navigationActions.showModal({
            name: 'forgotPasswordSuccess'
        }));
        yield put(updateState({ forgotPasswordSpinner: false }));
    } catch (err) {
        console.error('password recovery failed', err);
        yield put(updateState({ forgotPasswordSpinner: false, forgotPasswordFailed: true}));
    }
});

handle(types.RESET_PASSWORD, function*(sagaParams, {payload}) {
    const spin = active => put(updateState({ resetPasswordSpinner: active }));

    try {
        yield spin(true);

        const token = yield select(state => state.init.query.token);

        yield sessionApi.resetPassword({
            password: payload,
            token
        });

        yield put(updateState({
            resetPasswordSuccessful: true
        }));
        yield delay(3500);
        yield spin(false);
        yield put(navigationActions.navigate('login'));
    } catch (err) {
        console.error('password reset failed', err);
        yield spin(false);
        yield put(updateState({
            resetPasswordSuccessful: false
        }));
    }
});

function* updateUser(user = {}) {
    const loggedIn = new Date(user.expires_at) > new Date();

    yield put(updateState({
        user,
        loggedIn
    }));

    if (loggedIn) {
        yield put(actions.loginSuccess());
        const currentPath = location.pathname;

        yield call(subscribeToPushNotifications);

        if ( // Standalone App or Leader login should lead to /followers when possible, otherwise resonators
            currentPath === '/loginLeader' ||
            (currentPath === '/login' && (
                (window.matchMedia('(display-mode: standalone)').matches) ||
                (window.navigator.standalone) ||
                document.referrer.includes('android-app://')
            ))
        ) {
            yield put(navigationActions.navigate(user.isLeader ? 'followers' : 'follower/resonators'));
        } else if (currentPath === '/' || currentPath === '/login') { // regular Login should always lead to resonators
            yield put(navigationActions.navigate('follower/resonators'));
        }

    }

    return loggedIn;
}

function saveAuthToken(auth_token) {
    localStorage.setItem('auth_token', auth_token);
}

export default {saga, reducer};
