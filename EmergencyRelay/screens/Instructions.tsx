import React from 'react'; 

import { View, Text, ScrollView, StyleSheet, Button } from 'react-native'; 

import { useNavigation } from '@react-navigation/native'; 

import { useAuth } from '../contexts/AuthContext'; 

 
 

const Instructions = () => { 

const navigation = useNavigation(); 

const { isAdmin } = useAuth(); 

 
 

return ( 

<View style={styles.container}> 

<ScrollView contentContainerStyle={styles.scrollContainer}> 

<Text style={styles.title}>How to Use the App</Text> 

 
 

{/* GENERAL SECTION */} 

<Text style={styles.sectionHeader}>Getting Started</Text> 

<Text style={styles.text}> 

1. Log in using your assigned email and password.{'\n'} 

2. After logging in, you will be directed to your dashboard based on your role.{'\n'} 

3. Use the available options to navigate through the app. 

</Text> 

 
 

{/* STAFF FEATURES */} 

<Text style={styles.sectionHeader}>Staff Features</Text> 

 
 

<Text style={styles.subHeader}>View Class Rosters</Text> 

<Text style={styles.text}> 

- View student lists for your assigned classes.{'\n'} 

- Use this to check attendance or locate students quickly. 

</Text> 

 
 

<Text style={styles.subHeader}>Initiate Emergency</Text> 

<Text style={styles.text}> 

- Trigger an emergency alert when necessary.{'\n'} 

- Follow prompts to ensure accurate reporting. 

</Text> 

 
 

<Text style={styles.subHeader}>Logout</Text> 

<Text style={styles.text}> 

- Log out securely when you are done using the app. 

</Text> 

 
 

{/* ADMIN FEATURES */} 

{isAdmin() && ( 

<> 

<Text style={styles.sectionHeader}>Admin Features</Text> 

 
 

<Text style={styles.subHeader}>Manage Staff Accounts</Text> 

<Text style={styles.text}> 

- Add, edit, or remove staff accounts.{'\n'} 

- Assign appropriate roles and permissions. 

</Text> 

 
 

<Text style={styles.subHeader}>Manage Student IDs</Text> 

<Text style={styles.text}> 

- Create or update student ID records.{'\n'} 

- Ensure all student information is accurate. 

</Text> 

 
 

<Text style={styles.subHeader}>Class Roster Management</Text> 

<Text style={styles.text}> 

- Assign students to classes.{'\n'} 

- Modify or update class rosters as needed. 

</Text> 

 
 

<Text style={styles.subHeader}>Initiate / Manage Emergency</Text> 

<Text style={styles.text}> 

- Initiate emergency alerts.{'\n'} 

- Monitor and manage active emergency situations. 

</Text> 

</> 

)} 

 
 

</ScrollView> 

 
 

{/* BACK BUTTON (navigates to Login) */} 

<View style={styles.buttonContainer}> 

<Button title="Back" onPress={() => (navigation as any).navigate('Login')} /> 

</View> 

</View> 

); 

}; 

 
 

export default Instructions; 

 
 

const styles = StyleSheet.create({ 

container: { 

flex: 1, 

backgroundColor: '#ffffff', 

}, 

scrollContainer: { 

padding: 16, 

paddingBottom: 40, 

}, 

title: { 

fontSize: 26, 

fontWeight: 'bold', 

marginBottom: 20, 

textAlign: 'center', 

}, 

sectionHeader: { 

fontSize: 20, 

fontWeight: 'bold', 

marginTop: 20, 

marginBottom: 8, 

}, 

subHeader: { 

fontSize: 16, 

fontWeight: '600', 

marginTop: 10, 

}, 

text: { 

fontSize: 14, 

marginTop: 4, 

lineHeight: 20, 

}, 

buttonContainer: { 

padding: 10, 

borderTopWidth: 1, 

borderColor: '#ddd', 

}, 

}); 