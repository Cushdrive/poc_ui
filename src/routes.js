import React, {Component} from 'react';
import {Router, Route, browserHistory} from 'react-router';
import {requireAuthentication, requireTreatmentToken, requireInfusionToken} from './thirdPartyLibraries/auth0LockWrapper';
import Parent from './components/parentPage';
import Home from './components/homePage';
import Login from './components/loginPage';
import EditProfile from './components/editProfilePage';
import Treatment from './components/treatmentPage';
import Infusion from './components/infusionPage';
import TokenSaver from './components/tokenSaver';

class RouteHandler extends Component {
  render() {
    return (
      <Router history={browserHistory}>
        <Route component={Parent}>
          <Route path="/login*" component={Login} />
          <Route path="/saveToken" component={TokenSaver} />
          <Route onEnter={requireAuthentication}>
            {/* Place all authenticated routes here */}
            <Route path="/" component={Home} />
            <Route path="/profile/edit" component={EditProfile} />
            <Route onEnter={requireTreatmentToken}>
              <Route path="/treatments/view" component={Treatment} />
            </Route>
            <Route onEnter={requireInfusionToken}>
              <Route path="/infusions/view" component={Infusion} />
            </Route>
          </Route>
        </Route>
      </Router>
    );
  }
}

export default RouteHandler;
