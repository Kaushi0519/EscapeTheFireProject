import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const Instructions = () => {
  const { isAdmin } = useAuth();

  const Card = ({ title, children, color = '#4A90D9' }: { title: string; children: React.ReactNode; color?: string }) => (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Text style={[styles.cardTitle, { color }]}>{title}</Text>
      {children}
    </View>
  );

  const ListItem = ({ text, number }: { text: string; number?: number }) => (
    <View style={styles.listItem}>
      {number ? (
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{number}</Text>
        </View>
      ) : (
        <View style={styles.bullet} />
      )}
      <Text style={styles.listText}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome to Emergency Relay</Text>
          <Text style={styles.welcomeText}>
            This guide will help you understand how to use the app effectively.
          </Text>
        </View>

        {/* Purpose Section */}
        <Card title="What is Emergency Relay?" color="#2E7D32">
          <Text style={styles.text}>
            Emergency Relay is designed to help buildings manage emergency situations efficiently. 
            The app provides:
          </Text>
          <ListItem text="Real-time emergency alerts and notifications" />
          <ListItem text="Interactive building maps showing your location" />
          <ListItem text="Evacuation route guidance during emergencies" />
          <ListItem text="Student roster management and tracking" />
          <ListItem text="Quick communication between staff and administrators" />
        </Card>

        {/* Getting Started Section */}
        <Card title="Getting Started" color="#1976D2">
          <Text style={styles.text}>
            Follow these steps to begin using the app:
          </Text>
          <ListItem number={1} text="Log in with your assigned email and password provided by your administrator." />
          <ListItem number={2} text="Allow notification permissions when prompted - this is essential for receiving emergency alerts." />
          <ListItem number={3} text="Familiarize yourself with the Dashboard - your central hub for all features." />
          <ListItem number={4} text="Explore the Map feature to understand the building layout." />
        </Card>

        {/* Dashboard Overview */}
        <Card title="Understanding Your Dashboard" color="#7B1FA2">
          <Text style={styles.text}>
            The Dashboard is your main screen after logging in. From here you can access:
          </Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Map</Text>
              <Text style={styles.featureDesc}>View building layout and your current location</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Rosters</Text>
              <Text style={styles.featureDesc}>Access class lists and student information</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Instructions</Text>
              <Text style={styles.featureDesc}>This help guide you're reading now</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Logout</Text>
              <Text style={styles.featureDesc}>Securely sign out of your account</Text>
            </View>
          </View>
        </Card>

        {/* Emergency Procedures - Important Section */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencySectionTitle}>Emergency Procedures</Text>
          
          <Card title="When an Emergency Occurs" color="#D32F2F">
            <Text style={styles.text}>
              If you witness or become aware of an emergency situation:
            </Text>
            <ListItem number={1} text="Go to the Map screen from your Dashboard." />
            <ListItem number={2} text="Tap on the room or area where the emergency is occurring." />
            <ListItem number={3} text="Tap 'Declare Emergency' and confirm your selection." />
            <ListItem number={4} text="All staff members will receive an immediate notification." />
            <Text style={styles.importantNote}>
              Important: Only declare emergencies for genuine situations. False alarms disrupt building safety.
            </Text>
          </Card>

          <Card title="During an Active Emergency" color="#F57C00">
            <Text style={styles.text}>
              When an emergency is active:
            </Text>
            <ListItem text="A red banner will appear at the top of all screens indicating an emergency is in progress." />
            <ListItem text="The Map will show the emergency location highlighted in red." />
            <ListItem text="If evacuation is required, follow the evacuation routes displayed on your map." />
            <ListItem text="Map interactions are disabled during emergencies to prevent accidental taps." />
            <ListItem text="Stay calm and follow your building's standard emergency procedures." />
          </Card>

          <Card title="When Emergency Ends" color="#388E3C">
            <Text style={styles.text}>
              An administrator will end the emergency when the situation is resolved. When this happens:
            </Text>
            <ListItem text="The red emergency banner will disappear." />
            <ListItem text="Normal map functionality will be restored." />
            <ListItem text="You may receive an all-clear notification." />
            <ListItem text="Follow any additional instructions from administrators." />
          </Card>
        </View>

        {/* Staff Features */}
        <Card title="Staff Features" color="#0288D1">
          <View style={styles.featureSection}>
            <Text style={styles.featureHeader}>Class Rosters</Text>
            <Text style={styles.text}>
              Access and manage your assigned class rosters:
            </Text>
            <ListItem text="View complete student lists for each of your classes." />
            <ListItem text="See student details including ID numbers and contact information." />
            <ListItem text="Quickly locate and account for students during roll calls or emergencies." />
          </View>

          <View style={styles.featureSection}>
            <Text style={styles.featureHeader}>Building Map</Text>
            <Text style={styles.text}>
              Interact with the building floor plan:
            </Text>
            <ListItem text="View all rooms and common areas in the building." />
            <ListItem text="See your current location (when available)." />
            <ListItem text="Tap any room to view details or declare an emergency." />
          </View>
        </Card>

        {/* Admin Features - Only shown to admins */}
        {isAdmin() && (
          <>
            <View style={styles.adminSection}>
              <Text style={styles.adminSectionTitle}>Administrator Features</Text>
              <Text style={styles.adminNote}>
                These features are only available to administrators.
              </Text>

              <Card title="Staff Account Management" color="#5E35B1">
                <Text style={styles.text}>
                  Manage staff members who can use the app:
                </Text>
                <ListItem text="Create new staff accounts with email and password credentials." />
                <ListItem text="Edit existing staff information and update permissions." />
                <ListItem text="Remove staff accounts when no longer needed." />
                <ListItem text="Assign admin privileges to trusted staff members." />
              </Card>

              <Card title="Student ID Management" color="#00897B">
                <Text style={styles.text}>
                  Maintain the student database:
                </Text>
                <ListItem text="Add new students with their ID numbers and information." />
                <ListItem text="Update student records as needed." />
                <ListItem text="Remove students who have left the building." />
                <ListItem text="Ensure all student data is accurate and up-to-date." />
              </Card>

              <Card title="Roster Management" color="#F4511E">
                <Text style={styles.text}>
                  Organize students into class rosters:
                </Text>
                <ListItem text="Create new class rosters with descriptive names." />
                <ListItem text="Add or remove students from rosters." />
                <ListItem text="Assign rosters to staff members." />
                <ListItem text="Edit roster details and student assignments." />
              </Card>

              <Card title="Emergency Management" color="#C62828">
                <Text style={styles.text}>
                  Handle emergency situations:
                </Text>
                <ListItem text="Receive and respond to emergency alerts from staff." />
                <ListItem text="Confirm emergencies and choose evacuation requirements." />
                <ListItem text="Monitor active emergencies across the building." />
                <ListItem text="End emergencies when the situation is resolved." />
                <ListItem text="View emergency history for incident reports." />
              </Card>
            </View>
          </>
        )}

        {/* Tips Section */}
        <Card title="Tips for Effective Use" color="#455A64">
          <ListItem text="Keep the app updated to ensure you have the latest features and security patches." />
          <ListItem text="Enable push notifications to receive immediate emergency alerts." />
          <ListItem text="Familiarize yourself with the building map before an emergency occurs." />
          <ListItem text="Report any technical issues to your administrator promptly." />
          <ListItem text="Log out when using shared devices to protect your account." />
        </Card>

        {/* Support Section */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            If you encounter any issues or have questions about using Emergency Relay, 
            please contact your administrator for assistance.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
};

export default Instructions;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  welcomeCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 22,
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#757575',
    marginTop: 7,
    marginRight: 12,
  },
  numberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  numberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
    lineHeight: 22,
  },
  featureGrid: {
    marginTop: 8,
  },
  featureItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: '#616161',
  },
  featureSection: {
    marginBottom: 16,
  },
  featureHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  emergencySection: {
    marginVertical: 8,
  },
  emergencySectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 12,
    textAlign: 'center',
  },
  importantNote: {
    fontSize: 13,
    color: '#C62828',
    fontStyle: 'italic',
    marginTop: 12,
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 6,
  },
  adminSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  adminSectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5E35B1',
    marginBottom: 4,
    textAlign: 'center',
  },
  adminNote: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  supportSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: '#424242',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 