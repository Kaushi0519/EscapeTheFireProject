import * as Keychain from 'react-native-keychain';
import React from 'react';


export const KeychainExample = async () => {
  const username = 'zuck';
  const password = 'poniesRgr8';

  // Store the credentials
  await Keychain.setGenericPassword(username, password, {service: 'service_key'});

  try {
    // Retrieve the credentials
    const credentials = await Keychain.getGenericPassword({service: 'service_key'});
    if (credentials) {
      console.log(
        'Credentials successfully loaded for user ' + credentials.username
      );
    } else {
      console.log('No credentials stored');
    }
  } catch (error) {
    console.error("Failed to access Keychain", error);
  }

  // Reset the stored credentials
  await Keychain.resetGenericPassword({service: 'service_key'});
};