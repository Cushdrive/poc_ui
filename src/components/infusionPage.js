import React, {Component} from 'react';
import {connectProfile} from '../thirdPartyLibraries/auth0LockWrapper';

class Infusion extends Component {
	static propTypes = {
	    ...connectProfile.PropTypes
	  };
	render() {
		return (
				<div></div>
			);
	}

}

export default connectProfile(Infusion);