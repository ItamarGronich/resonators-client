import _ from 'lodash';
import SagaReducerFactory from 'SagaReducerFactory';
import { call, put, select } from 'redux-saga/effects';
import { actions, types } from '../actions/followersActions';
import { actions as navigationActions } from '../actions/navigationActions';
import { types as sessionActionTypes} from '../actions/sessionActions';
import * as followerApi from '../api/follower';

let followersSelector = state => state.followers.followers;

let {handle, updateState, saga, reducer} = SagaReducerFactory({
    actionTypes: types,
    actionCreators: actions,
    initState: {
        followers: [],
        filterByClinicId: 'all'
    }
});

handle(sessionActionTypes.LOGIN_SUCCESS, function*() {
    let followers = yield call(followerApi.get);

    yield put(updateState({
        followers
    }));
});

handle(types.CREATE, function*(sagaParams, {payload}) {
    let follower = yield call(followerApi.create, payload);

    follower.user.email = payload.email;
    yield updateStateWithNewFollower(follower);
    yield hideModal();
});

handle(types.DELETE, function*(sagaParams, {payload}) {
    yield call(followerApi.deleteFollower, payload);
    let followers = yield select(followersSelector);
    let followersWithoutDeleted = _.reject(followers, f => f.id === payload);

    yield put(updateState({
        followers: followersWithoutDeleted
    }));

    yield hideModal();
});

handle(types.UPDATE, function*(sagaParams, {payload}) {
    yield call(followerApi.edit, payload);
    let followers = yield select(followersSelector)
    let follower = _.find(followers, f => f.id === payload.id);
    let updatedFollower = {
        ...follower,
        user: {
            ...follower.user,
            name: payload.name,
            email: payload.email
        }
    };

    yield updateStateWithNewFollower(updatedFollower);
    yield hideModal();
});

function* updateStateWithNewFollower(follower) {
    let lastFollowers = yield select(followersSelector);

    let followers = _.reject(lastFollowers, f => f.id === follower.id)
                     .concat(follower);

    yield put(updateState({
        followers
    }));
}

function* hideModal() {
    yield put(navigationActions.hideModal());
}

export default {saga, reducer};
