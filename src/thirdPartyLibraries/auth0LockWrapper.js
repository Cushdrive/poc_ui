import decode from 'jwt-decode';
import {EventEmitter} from 'events';
import React, {Component, PropTypes} from 'react';
import {browserHistory} from 'react-router';
import Auth0Lock from 'auth0-lock';
import {WebAuth} from 'auth0-js';

const NEXT_PATH_KEY = 'next_path';
const ID_TOKEN_KEY = 'id_token';
const USER_ACCESS_TOKEN_KEY = 'user_access_token';
const TREATMENT_API_TOKEN_KEY = 'treatment_access_token';
const INFUSION_API_TOKEN_KEY = 'infusion_access_token';
const PROFILE_KEY = 'profile';
const LOGIN_ROUTE = '/login';
const ROOT_ROUTE = '/';
const TREATMENT_ROUTE = '/treatments/view';
const TOKEN_SAVER = '/saveToken';
const BASE_QPARAM = '?'
const AUTHN_REQUIRED_QPARAM = 'type=authenticate';
const TREATMENT_AUTHZ_REQUIRED_QPARAM = 'type=treatment_authz';
const INFUSION_AUTHZ_REQUIRED_QPARAM = 'type=infusion_authz';

if (!process.env.REACT_APP_AUTH0_CLIENT_ID || !process.env.REACT_APP_AUTH0_DOMAIN) {
  throw new Error('Please define `REACT_APP_AUTH0_CLIENT_ID` and `REACT_APP_AUTH0_DOMAIN` in your .env file');
}

//TODO: There's some funny behavior if the user has to authentication and then authorize
//back to back. The solution is to redirect to the tokenSaver page, but the parsing function
//below needs to know whether we're authenticating or asking for authorization.
const lock = new Auth0Lock(
  process.env.REACT_APP_AUTH0_CLIENT_ID,
  process.env.REACT_APP_AUTH0_DOMAIN, {
    allowedConnections: ['Username-Password-Authentication'],
    rememberLastLogin: false,
    auth: {
      redirectUrl: `${window.location.origin}${LOGIN_ROUTE}`,
      responseType: 'token',
      sso: true,
      params: {state: 'AUTHN'}
    }
  }
);

var authOpts = {
    clientID: process.env.REACT_APP_AUTH0_CLIENT_ID,
    domain: process.env.REACT_APP_AUTH0_DOMAIN,
    responseType: 'token id_token',
    responseMode: 'fragment',
    scope: 'openid name email read:mytreatments treatment-service poc-application',
    audience: 'gateway',
    state: 'API',
    nonce: 'baxter'
};

const auth = new WebAuth(authOpts);

const events = new EventEmitter();

lock.on('authenticated', authenticateResult => {
  //This event fires when we're getting an API token as well. We don't want
  //to replace our User tokens when API tokens.
  if ((authenticateResult) && (authenticateResult.state != "API")) {
    setIdToken(authenticateResult.idToken);
    setUserAccessToken(authenticateResult.accessToken);
    lock.getUserInfo(authenticateResult.accessToken, (error, profile) => {
      if (error) { 
        console.log(error);
        return setProfile({error}); 
      }
      setProfile(profile);
      console.log("Redirecting after authentication: " + getNextPath());
      browserHistory.push(getNextPath());
      clearNextPath();
    });
  }
});

export function authorizeAPICalls() {
  authOpts.redirectUri = `${window.location.origin}${TOKEN_SAVER}`;
  auth.authorize(authOpts);
}

export function parseAPITokenHash() {
  auth.parseHash({nonce: 'baxter', state: 'api', hash: window.location.hash} ,(err, token_payload) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log(token_payload);
    setTreatmentAPIToken(token_payload.accessToken);
    //This could be different later.
    setInfusionAPIToken(token_payload.accessToken);
    browserHistory.push(getNextPath());
    clearNextPath();
  } );
}

export function login(options) {
  lock.show(options);
  return {
    hide() {
      lock.hide();
    }
  }
}

export function logout() {
  clearNextPath();
  clearIdToken();
  clearProfile();
  //Temporary.
  clearAPITokens();
  browserHistory.push(LOGIN_ROUTE + BASE_QPARAM + AUTHN_REQUIRED_QPARAM);
}

export function requireAuthentication(nextState, replace) {
  console.log(nextState);
  if (!isLoggedIn()) {
    setNextPath(nextState.location.pathname);
    replace({pathname: LOGIN_ROUTE, search: BASE_QPARAM + AUTHN_REQUIRED_QPARAM});
  }
}

export function requireTreatmentToken(nextState, replace) {
  if (!hasTreatmentToken()) {
    setNextPath(nextState.location.pathname);
    replace({pathname: LOGIN_ROUTE, search: BASE_QPARAM + TREATMENT_AUTHZ_REQUIRED_QPARAM});
  }
}

export function requireInfusionToken(nextState, replace) {
  if (!hasInfusionToken()) {
    setNextPath(nextState.location.pathname);
    replace({pathname: LOGIN_ROUTE, search: BASE_QPARAM + INFUSION_AUTHZ_REQUIRED_QPARAM});
  }
}

export function connectProfile(WrappedComponent) {
  return class ProfileContainer extends Component {
    state = {
      profile: null
    };

    componentWillMount() {
      this.profileSubscription = subscribeToProfile((profile) => {
        this.setState({profile});
      });
    }

    componentWillUnmount() {
      this.profileSubscription.close();
    }

    render() {
      return (
        <WrappedComponent
          {...this.props}
          profile={this.state.profile}
          onUpdateProfile={this.onUpdateProfile}
        />
      );
    }

    onUpdateProfile = (newProfile) => {
      return updateProfile(this.state.profile.user_id, newProfile);
    }
  };
}

connectProfile.PropTypes = {
  profile: PropTypes.object,
  onUpdateProfile: PropTypes.func
};

export function fetchAsUser(input, init={}) {
  const headers = init.headers || {};

  return fetch(input, {
    ...init,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getIdToken()}`,
      ...headers
    }
  }).then((response) => {
    if (!response.ok) { throw new Error(response); }
    return response;
  });
}

function subscribeToProfile(subscription) {
  events.on('profile_updated', subscription);

  if (isLoggedIn()) {
    subscription(getProfile());
    lock.getUserInfo(getUserAccessToken(), (error, profile) => {
      if (error) { return setProfile({error}); }
      setProfile(profile);
    });
  }

  return {
    close() {
      events.removeListener('profile_updated', subscription);
    }
  };
}

async function updateProfile(userId, newProfile) {
  try {
    const response = await fetchAsUser(`https://${process.env.REACT_APP_AUTH0_DOMAIN}/api/v2/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(newProfile)
    });

    const profile = await response.json();
    setProfile(profile);
  } catch (error) {
    return error;
  }
}

function setProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  events.emit('profile_updated', profile);
}

function getProfile() {
  return JSON.parse(localStorage.getItem(PROFILE_KEY));
}

function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
  events.emit('profile_updated', null);
}

function setIdToken(idToken) {
  localStorage.setItem(ID_TOKEN_KEY, idToken);
}

function setUserAccessToken(accessToken) {
  localStorage.setItem(USER_ACCESS_TOKEN_KEY, accessToken);
}

function getUserAccessToken(accessToken) {
  return localStorage.getItem(USER_ACCESS_TOKEN_KEY);
}

export function getIdToken() {
  return localStorage.getItem(ID_TOKEN_KEY);
}

export function getInfusionAPIToken() {
  return localStorage.getItem(INFUSION_API_TOKEN_KEY);
}

export function getTreatmentAPIToken() {
  return localStorage.getItem(TREATMENT_API_TOKEN_KEY);
}

function setTreatmentAPIToken(accessToken) {
  localStorage.setItem(TREATMENT_API_TOKEN_KEY, accessToken);
}

function setInfusionAPIToken(accessToken) {
  localStorage.setItem(INFUSION_API_TOKEN_KEY, accessToken);
}

function clearIdToken() {
  localStorage.removeItem(ID_TOKEN_KEY);
}

function clearAPITokens() {
  localStorage.removeItem(TREATMENT_API_TOKEN_KEY);
  localStorage.removeItem(INFUSION_API_TOKEN_KEY);
}

function setNextPath(nextPath) {
  localStorage.setItem(NEXT_PATH_KEY, nextPath);
}

function getNextPath() {
  return localStorage.getItem(NEXT_PATH_KEY) || ROOT_ROUTE;
}

function clearNextPath() {
  localStorage.removeItem(NEXT_PATH_KEY);
}

function isLoggedIn() {
  const idToken = getIdToken();
  return idToken && !isTokenExpired(idToken);
}

function hasTreatmentToken() {
  const accessToken = getTreatmentAPIToken();
  return accessToken && !isTokenExpired(accessToken);
}

function hasInfusionToken() {
  const accessToken = getInfusionAPIToken();
  return accessToken && !isTokenExpired(accessToken);
}

function getTokenExpirationDate(encodedToken) {
  const token = decode(encodedToken);
  if (!token.exp) { return null; }

  const date = new Date(0);
  date.setUTCSeconds(token.exp);

  return date;
}

function isTokenExpired(token) {
  const expirationDate = getTokenExpirationDate(token);
  return expirationDate < new Date();
}
