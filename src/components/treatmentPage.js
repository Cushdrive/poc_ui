import React, {Component} from 'react';
import {connectProfile, getTreatmentAPIToken, getIdToken} from '../thirdPartyLibraries/auth0LockWrapper';

class Treatment extends Component {
	static propTypes = {
	    ...connectProfile.PropTypes
	  };
	render() {
		return (
				<div>
					<div>{getTreatmentAPIToken()}</div>
				</div>
			);
	}

}

export default connectProfile(Treatment);