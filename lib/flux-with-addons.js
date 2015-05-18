import BareNanoFlux from './flux';

import connectToStores from './addons/connect-to-stores';
import injectActions from './addons/inject-actions';

import assign from 'object-assign';

const NanoFlux = assign({}, BareNanoFlux);

NanoFlux.addons = {
  connectToStores,
  injectActions
};

export default NanoFlux;
