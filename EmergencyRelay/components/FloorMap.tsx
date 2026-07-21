import React, { useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, Pressable, Text, StyleSheet, Dimensions, LayoutChangeEvent, Platform, ScrollView } from 'react-native';

// Floor images - add secondFloorView.png and thirdFloorView.png when available
const floorImages: { [key: number]: any } = {
    1: require('../assets/firstFloorView.png'),
    2: require('../assets/SquashFloorplan.png'),
    3: require('../assets/AdminFloor.png'),
};

// Pre-defined image dimensions (update these if you change the images)
// You can get these by checking the image file properties or running:
// file assets/yourimage.png
const floorImageDimensions: { [key: number]: { width: number; height: number } } = {
    1: { width: 659, height: 379 }, // firstFloorView.png actual dimensions
    2: { width: 777, height: 321 }, // SquashFloorplan.png actual dimensions
    3: { width: 659, height: 379 }, // Update when you add thirdFloorView.png
};

// Room definitions for each floor
// Coordinates are percentages of image dimensions (0-100)
interface RoomArea {
    id: string;
    name: string;
    type: 'room' | 'hall' | 'stairwell';
    // Position as percentage of image (0-100)
    x: number;      // left position %
    y: number;      // top position %
    width: number;  // width %
    height: number; // height %
    // For stairwells - links to corresponding stairwell on other floors
    stairwellGroup?: string; // e.g., 'A', 'B', 'C' - same letter = connected stairwells
}

// Stairwell groups - selecting one highlights all in the same group across floors
// Note: Each floor can have different stairwell positions, but same group letter = connected
const STAIRWELL_GROUPS = {
    'A': ['stair-A-1', 'stair-A-2', 'stair-A-3'], // Stairwell A (all floors)
    'B': ['stair-B-1', 'stair-B-2', 'stair-B-3'], // Stairwell B (all floors)
    'C': ['stair-C-1'], // Stairwell C (floor 1 only)
};

// Room coordinates calibrated to each floor's plan image
// Each floor can have a DIFFERENT number of rooms and different positions!
// Values are percentages (0-100) of the image dimensions
// 
// HOW TO CONFIGURE A FLOOR:
// 1. Add your floor plan image to assets/ folder
// 2. Update floorImages[floorNumber] to require your image
// 3. Update floorImageDimensions[floorNumber] with actual pixel dimensions
// 4. Define rooms in roomsByFloor[floorNumber] with x, y, width, height as percentages
//    - x: distance from left edge (0 = left, 100 = right)
//    - y: distance from top edge (0 = top, 100 = bottom)
//    - width/height: room size as percentage of image
//
const roomsByFloor: { [key: number]: RoomArea[] } = {
    1: [
        // =====================================================
        // FLOOR 1 - firstFloorView.png (659x379 pixels)
        // =====================================================
        // Far left wing rooms
        { id: 'room-2', name: 'Room 101', type: 'room', x: 2.5, y: 38.5, width: 7, height: 18 },
        { id: 'room-4', name: 'Room 105', type: 'room', x: 21.5, y: 38.5, width: 6, height: 12.5 },
        { id: 'room-7', name: 'Room 102', type: 'room', x: 5, y: 56, width: 6, height: 11.5 },
        
        // Main Hall (vertical)
        { id: 'hall-main', name: 'Main Hall', type: 'hall', x: 9.5, y: 51, width: 35.5, height: 5 },
        
        // Left-center rooms (vertical stack)
        { id: 'room-11', name: 'Room 103', type: 'room', x: 9.5, y: 38.5, width: 10.5, height: 11 },
        { id: 'room-12', name: 'Room 106', type: 'room', x: 17.5, y: 56.5, width: 6.5, height: 11 },
        { id: 'room-13', name: 'Room 104', type: 'room', x: 11, y: 56.5, width: 6.5, height: 11 },
        { id: 'room-14', name: 'Room 108', type: 'room', x: 24, y: 56.5, width: 6, height: 11 },
        { id: 'room-15', name: 'Room 107', type: 'room', x: 27.5, y: 38.5, width: 5, height: 12.5 },
        
        // Upper center rooms
        { id: 'room-8', name: 'Room 109', type: 'room', x: 32.5, y: 38.5, width: 10.5, height: 12.5 },
        { id: 'room-9', name: 'Room 112', type: 'room', x: 47, y: 6.5, width: 11, height: 15 },
        { id: 'room-10', name: 'Room 111', type: 'room', x: 33.5, y: 9.5, width: 13.5, height: 15 },
        
        // Center Hall (horizontal)
        { id: 'hall-center', name: 'Center Hall', type: 'hall', x: 39.5, y: 24, width: 13.5, height: 7 },
        
        // Upper right area
        { id: 'room-16', name: 'Room 113', type: 'room', x: 55, y: 46, width: 6, height: 12 },
        { id: 'room-17', name: 'Room 114', type: 'room', x: 59, y: 53, width: 6, height: 12 },
        
        // Stairwell A (red - upper right)
        { id: 'stair-A-1', name: 'Stairwell A', type: 'stairwell', stairwellGroup: 'A', x: 45, y: 56.5, width: 6, height: 10 },
        
        // Middle section rooms
        { id: 'room-18', name: 'Room 115', type: 'room', x: 63.7, y: 58.5, width: 6, height: 12 },
        { id: 'room-19', name: 'Room 116', type: 'room', x: 68, y: 65, width: 5, height: 11 },
        { id: 'room-20', name: 'Room 117', type: 'room', x: 71.5, y: 74, width: 3.5, height: 5 },
        { id: 'room-21', name: 'Room 118', type: 'room', x: 74.5, y: 78, width: 3.5, height: 5 },
        
        // Stairwell B (red - middle)
        { id: 'stair-B-1', name: 'Stairwell B', type: 'stairwell', stairwellGroup: 'B', x: 46, y: 35, width: 5, height: 5 },
        
        // Stairwell C (red - lower middle)
        { id: 'stair-C-1', name: 'Stairwell C', type: 'stairwell', stairwellGroup: 'C', x: 55, y: 27, width: 6, height: 6 },
        
        // Lower right wing
        { id: 'room-22', name: 'Room 110', type: 'room', x: 46, y: 41, width: 6, height: 10 },
        { id: 'room-24', name: 'Room 119', type: 'room', x: 64, y: 26, width: 25, height: 30 },
        
        // Right Hall (vertical)
        { id: 'hall-right', name: 'Right Hall', type: 'hall', x: 56, y: 53.5, width: 25, height: 4 },
        
        // Far right rooms
        
        
        // Far right room
        //{ id: 'room-27', name: 'Room 27', type: 'room', x: 90, y: 35, width: 8, height: 25 },
    ],
    2: [
        // =====================================================
        // FLOOR 2 - SquashFloorplan.png (777x321 pixels)
        // Unique layout - customize room positions to match your floor plan
        // Coordinates are percentages (0-100) of the image dimensions
        // =====================================================
        
        // Left section rooms
        { id: 'room-201', name: '201', type: 'room', x: 6.8, y: 14.4, width: 12.2, height: 43 },
        { id: 'room-202', name: '202', type: 'room', x: 10.3, y: 58, width: 8.5, height: 26.5 },
        { id: 'room-203', name: '203', type: 'room', x: 19, y: 61, width: 4, height: 23.5 },
        
        // Center section
        { id: 'hall-main-2', name: 'Main Hall', type: 'hall', x: 23, y: 66, width: 57, height: 18 },
        { id: 'hall-side-2', name: 'Side Hall', type: 'hall', x: 34, y: 15, width: 6, height: 46 },
        { id: 'room-204', name: '204', type: 'room', x: 19.2, y: 14.8, width: 14.4, height: 25 },
        { id: 'room-205', name: '205', type: 'room', x: 19, y: 40, width: 14.8, height: 20.5 },
        { id: 'room-206', name: '206', type: 'room', x: 40.2, y: 39.2, width: 14.5, height: 21.2 },
        
        // Right section  
        { id: 'room-207', name: '207', type: 'room', x: 40, y: 15, width: 14.5, height: 24 },
        { id: 'room-208', name: '208', type: 'room', x: 55, y: 39, width: 13, height: 28 },
        { id: 'room-209', name: '209', type: 'room', x: 54.6, y: 15, width: 8.5, height: 23 },
        { id: 'room-210', name: '210', type: 'room', x: 63, y: 15, width: 24.2, height: 23 },
        { id: 'room-211', name: '211', type: 'room', x: 68, y: 52, width: 4.5, height: 15 },
        { id: 'room-212', name: '212', type: 'room', x: 68, y: 44, width: 4.5, height: 8.5 },
        { id: 'room-213', name: '213', type: 'room', x: 68, y: 38.3, width: 4.5, height: 5.5 },
        { id: 'room-214', name: '214', type: 'room', x: 72.6, y: 38.3, width: 18.7, height: 27.5 },
        { id: 'room-215', name: '215', type: 'room', x: 87.3, y: 15, width: 4, height: 23 },


        // Stairwells (same location relative to building structure)
        { id: 'stair-A-2', name: 'Stairwell A', type: 'stairwell', stairwellGroup: 'A', x: 80.5, y: 67, width: 10.5, height: 17 },
    ],
    3: [
        // =====================================================
        // FLOOR 3 - thirdFloorView.png (add image when available)
        // Unique layout - customize room positions to match your floor plan
        // Coordinates are percentages (0-100) of the image dimensions
        // =====================================================
        
        // Example: Administrative floor with different layout
        { id: 'room-301', name: '301', type: 'room', x: 7, y: 31, width: 8.3, height: 26 },
        { id: 'room-302', name: '302', type: 'room', x: 15.3, y: 47.2, width: 5, height: 10 },
        { id: 'room-303', name: '303', type: 'room', x: 20, y: 47.5, width: 5, height: 10 },
        { id: 'room-316', name: '316', type: 'room', x: 25, y: 47.5, width: 6.8, height: 10 },
        { id: 'room-317', name: '317', type: 'room', x: 32, y: 47.5, width: 6.6, height: 10 },
        { id: 'room-318', name: '318', type: 'room', x: 38.7, y: 47.5, width: 9, height: 10 },
        { id: 'room-319', name: '319', type: 'room', x: 51.2, y: 46.5, width: 6.4, height: 10 },
        { id: 'room-320', name: '320', type: 'room', x: 57.6, y: 46.5, width: 5.6, height: 10 },
        { id: 'room-321', name: '321', type: 'room', x: 63, y: 46.5, width: 5, height: 10 },
        { id: 'room-322', name: '322', type: 'room', x: 68, y: 46.5, width: 4.8, height: 10 },
        { id: 'room-323', name: '323', type: 'room', x: 72.7, y: 46.5, width: 5.3, height: 10 },
        { id: 'room-324', name: '324', type: 'room', x: 78, y: 34.5, width: 12, height: 17 },
        { id: 'room-325', name: '325', type: 'room', x: 78, y: 51.5, width: 12, height: 21.8 },


        
        // Center corridor
        { id: 'hall-main-3a', name: 'Main Hall', type: 'hall', x: 15.3, y: 40, width: 62.5, height: 6.7 },
        { id: 'hall-main-3b', name: '', type: 'hall', x: 15.3, y: 33, width: 3.4, height: 7 },
        { id: 'hall-main-3c', name: '', type: 'hall', x: 47.5, y: 46.5, width: 3.8, height: 10 },
        { id: 'hall-side-3', name: 'Side Hall', type: 'hall', x: 47.5, y: 56.5, width: 30.4, height: 8.5 },

        // Office spaces
        { id: 'room-304', name: '304', type: 'room', x: 18.7, y: 33, width: 4.5, height: 7 },
        { id: 'room-305', name: '305', type: 'room', x: 23.2, y: 33, width: 3, height: 7 },
        { id: 'room-306', name: '306', type: 'room', x: 26.4, y: 31, width: 8.2, height: 9 },
        { id: 'room-307', name: '307', type: 'room', x: 34.5, y: 31, width: 5, height: 9 },
        { id: 'room-308', name: '308', type: 'room', x: 39.5, y: 31, width: 4.4, height: 9 },
        { id: 'room-309', name: '309', type: 'room', x: 43.8, y: 31, width: 4.2, height: 9 },
        { id: 'room-310', name: '310', type: 'room', x: 48, y: 31, width: 7.5, height: 9 },
        { id: 'room-311', name: '311', type: 'room', x: 55.5, y: 31, width: 4, height: 9 },
        { id: 'room-312', name: '312', type: 'room', x: 59.5, y: 31, width: 5, height: 9 },
        { id: 'room-313', name: '313', type: 'room', x: 64.5, y: 31, width: 4.8, height: 9 },
        { id: 'room-314', name: '314', type: 'room', x: 69.3, y: 31, width: 4, height: 9 },
        { id: 'room-315', name: '315', type: 'room', x: 73.3, y: 31, width: 4.4, height: 9 },

                
        // Stairwells
        { id: 'stair-A-3', name: 'Stairwell A', type: 'stairwell', stairwellGroup: 'A', x: 15, y: 25, width: 11.3, height: 8 },
        { id: 'stair-B-3', name: 'Stairwell B', type: 'stairwell', stairwellGroup: 'B', x: 78, y: 25, width: 12, height: 9 },
    ],
};

interface FloorMapProps {
    onRoomPress?: (floor: number, roomId: string, roomName: string, type: string, stairwellGroup?: string) => void;
    highlightedRooms?: string[]; // Room IDs to highlight (e.g., rooms with alerts)
    selectedStairwellGroup?: string | null; // Currently selected stairwell group
    showGrid?: boolean; // Toggle grid visibility
    gridRows?: number; // Number of grid rows
    gridCols?: number; // Number of grid columns
    emergencyMode?: boolean; // When true, disables room clicks and shows emergency styling
    emergencyLocation?: string | null; // Room name/id where emergency is located
    escapePath?: { roomId: string; floor: number }[]; // Placeholder for escape route path
}

export default function FloorMap({ 
    onRoomPress, 
    highlightedRooms = [], 
    selectedStairwellGroup = null, 
    showGrid = true, 
    gridRows = 10, 
    gridCols = 10,
    emergencyMode = false,
    emergencyLocation = null,
    escapePath = [],
}: FloorMapProps) {
    const [currentFloor, setCurrentFloor] = useState(1);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [imageLayout, setImageLayout] = useState({ offsetX: 0, offsetY: 0, width: 0, height: 0 });
    const [showGridLabels, setShowGridLabels] = useState(false);
    const totalFloors = 3;
    
    // Get screen dimensions dynamically
    const screenHeight = Dimensions.get('window').height || 600;

    // Recalculate where the image is actually rendered (for resizeMode="contain")
    const recalculateImageLayout = (containerWidth: number, containerHeight: number, imgWidth: number, imgHeight: number) => {
        if (containerWidth === 0 || containerHeight === 0) return;
        if (imgWidth === 0 || imgHeight === 0) return;

        const containerAspect = containerWidth / containerHeight;
        const imageAspect = imgWidth / imgHeight;

        let renderedWidth: number;
        let renderedHeight: number;
        let offsetX: number;
        let offsetY: number;

        if (imageAspect > containerAspect) {
            // Image is wider than container - width fills, height is smaller
            renderedWidth = containerWidth;
            renderedHeight = containerWidth / imageAspect;
            offsetX = 0;
            offsetY = (containerHeight - renderedHeight) / 2;
        } else {
            // Image is taller than container - height fills, width is smaller
            renderedHeight = containerHeight;
            renderedWidth = containerHeight * imageAspect;
            offsetX = (containerWidth - renderedWidth) / 2;
            offsetY = 0;
        }

        setImageLayout({ offsetX, offsetY, width: renderedWidth, height: renderedHeight });
    };

    // Recalculate layout when container size changes - use pre-defined image dimensions
    useEffect(() => {
        const imgDims = floorImageDimensions[currentFloor];
        if (containerSize.width > 0 && containerSize.height > 0 && imgDims) {
            recalculateImageLayout(containerSize.width, containerSize.height, imgDims.width, imgDims.height);
        }
    }, [containerSize.width, containerSize.height, currentFloor]);

    const onContainerLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setContainerSize({ width, height });
    };

    const goToPrevFloor = () => {
        setCurrentFloor(prev => (prev > 1 ? prev - 1 : totalFloors));
    };

    const goToNextFloor = () => {
        setCurrentFloor(prev => (prev < totalFloors ? prev + 1 : 1));
    };

    const handleRoomPress = (room: RoomArea) => {
        // Disable room interactions during emergency mode
        if (emergencyMode) {
            return;
        }
        if (onRoomPress) {
            onRoomPress(currentFloor, room.id, room.name, room.type, room.stairwellGroup);
        }
    };

    // Check if a room is the emergency location
    const isEmergencyRoom = (room: RoomArea) => {
        if (!emergencyMode || !emergencyLocation) return false;
        return room.name.toLowerCase().includes(emergencyLocation.toLowerCase()) ||
               emergencyLocation.toLowerCase().includes(room.name.toLowerCase());
    };

    // Render 2D grid overlay
    const renderGrid = () => {
        if (!showGrid || imageLayout.width === 0 || imageLayout.height === 0) {
            return null;
        }

        const cellWidth = imageLayout.width / gridCols;
        const cellHeight = imageLayout.height / gridRows;
        const gridLines: React.ReactNode[] = [];

        // Vertical lines
        for (let col = 0; col <= gridCols; col++) {
            gridLines.push(
                <View
                    key={`v-${col}`}
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        left: imageLayout.offsetX + col * cellWidth,
                        top: imageLayout.offsetY,
                        width: 1,
                        height: imageLayout.height,
                        backgroundColor: 'rgba(100, 150, 255, 0.4)',
                    }}
                />
            );
        }

        // Horizontal lines
        for (let row = 0; row <= gridRows; row++) {
            gridLines.push(
                <View
                    key={`h-${row}`}
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        left: imageLayout.offsetX,
                        top: imageLayout.offsetY + row * cellHeight,
                        width: imageLayout.width,
                        height: 1,
                        backgroundColor: 'rgba(100, 150, 255, 0.4)',
                    }}
                />
            );
        }

        // Grid labels (coordinates)
        if (showGridLabels) {
            for (let col = 0; col < gridCols; col++) {
                for (let row = 0; row < gridRows; row++) {
                    gridLines.push(
                        <Text
                            key={`label-${col}-${row}`}
                            style={{
                                position: 'absolute',
                                left: imageLayout.offsetX + col * cellWidth + cellWidth / 2 - 8,
                                top: imageLayout.offsetY + row * cellHeight + cellHeight / 2 - 10,
                                fontSize: 9,
                                color: 'rgba(33, 150, 243, 0.6)',
                                fontWeight: 'bold',
                                pointerEvents: 'none',
                            } as any}
                        >
                            {col},{row}
                        </Text>
                    );
                }
            }
        }

        // Wrap all grid elements in a container with pointerEvents="none"
        return (
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                {gridLines}
            </View>
        );
    };

    const getFloorLabel = (floor: number) => {
        switch (floor) {
            case 1: return '1st Floor';
            case 2: return '2nd Floor';
            case 3: return '3rd Floor';
            default: return `Floor ${floor}`;
        }
    };

    // Check if a room should be highlighted (stairwell in selected group)
    const isStairwellSelected = (room: RoomArea) => {
        if (!selectedStairwellGroup || room.type !== 'stairwell') return false;
        return room.stairwellGroup === selectedStairwellGroup;
    };

    const currentRooms = roomsByFloor[currentFloor] || [];
    const hasFloorImage = floorImages[currentFloor] !== undefined;

    // Calculate room position in pixels based on actual image layout
    const getRoomStyle = (room: RoomArea) => {
        if (imageLayout.width === 0 || imageLayout.height === 0) {
            // Fallback to percentage-based if layout not calculated yet
            return {
                left: `${room.x}%` as any,
                top: `${room.y}%` as any,
                width: `${room.width}%` as any,
                height: `${room.height}%` as any,
            };
        }
        
        // Calculate position relative to where the image is actually rendered
        return {
            left: imageLayout.offsetX + (room.x / 100) * imageLayout.width,
            top: imageLayout.offsetY + (room.y / 100) * imageLayout.height,
            width: (room.width / 100) * imageLayout.width,
            height: (room.height / 100) * imageLayout.height,
        };
    };

    return (
        <View style={styles.container}>
            {/* Emergency Mode Banner */}
            {emergencyMode && (
                <View style={styles.emergencyBanner}>
                    <Text style={styles.emergencyBannerText}>EMERGENCY MODE</Text>
                </View>
            )}

            {/* Floor selector header */}
            <View style={[styles.header, emergencyMode && styles.headerEmergency]}>
                <TouchableOpacity onPress={goToPrevFloor} style={styles.arrowButton}>
                    <Text style={styles.arrowText}>◀</Text>
                </TouchableOpacity>
                
                <Text style={styles.floorLabel}>{getFloorLabel(currentFloor)}</Text>
                
                <TouchableOpacity onPress={goToNextFloor} style={styles.arrowButton}>
                    <Text style={styles.arrowText}>▶</Text>
                </TouchableOpacity>

                {/* Grid toggle buttons */}
                {showGrid && (
                    <View style={styles.gridToggleContainer}>
                        <TouchableOpacity 
                            style={[styles.gridToggleButton, styles.gridToggleButtonActive]}
                            onPress={() => setShowGridLabels(!showGridLabels)}
                        >
                            <Text style={styles.gridToggleButtonText}>
                                {showGridLabels ? '🔲' : '▦'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Floor map image with clickable rooms */}
            <View style={[styles.mapContainer, { height: Math.max(screenHeight * 0.3, 200) }]} onLayout={onContainerLayout}>
                {hasFloorImage ? (
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                        <Image
                            source={floorImages[currentFloor]}
                            style={styles.mapImage}
                            resizeMode="contain"
                        />
                    </View>
                ) : (
                    <View style={styles.placeholderMap} pointerEvents="none">
                        <Text style={styles.placeholderText}>
                            {getFloorLabel(currentFloor)} image not available
                        </Text>
                        <Text style={styles.placeholderSubtext}>
                            Add {currentFloor === 2 ? 'secondFloorView.png' : 'thirdFloorView.png'} to assets/
                        </Text>
                    </View>
                )}

                {/* 2D Grid Overlay */}
                {renderGrid()}

                {/* Clickable room overlays */}
                {currentRooms.map(room => {
                    const isHighlighted = highlightedRooms.includes(room.id);
                    const isStairSelected = isStairwellSelected(room);
                    const isEmergency = isEmergencyRoom(room);
                    return (
                        <Pressable
                            key={room.id}
                            style={({ pressed }) => [
                                styles.roomOverlay,
                                room.type === 'stairwell' && styles.stairwellOverlay,
                                room.type === 'hall' && styles.hallOverlay,
                                isHighlighted && styles.roomHighlighted,
                                isStairSelected && styles.stairwellSelected,
                                isEmergency && styles.roomEmergency,
                                emergencyMode && styles.roomDisabled,
                                getRoomStyle(room),
                                pressed && !emergencyMode && styles.roomPressed,
                                room.id === 'room-10' && { transform: [{ rotate: '348deg' }] },
                                room.id === 'room-9' && { transform: [{ rotate: '348deg' }] },
                                room.id === 'hall-center' && { transform: [{ rotate: '348deg' }] },
                                room.id === 'room-16' && { transform: [{ rotate: '40deg' }] },
                                room.id === 'room-17' && { transform: [{ rotate: '40deg' }] },
                                room.id === 'room-18' && { transform: [{ rotate: '40deg' }] },
                                room.id === 'room-19' && { transform: [{ rotate: '40deg' }] },
                                room.id === 'room-20' && { transform: [{ rotate: '40deg' }] },
                                room.id === 'room-21' && { transform: [{ rotate: '40deg' }] },
                                room.id === 'stair-C-1' && { transform: [{ rotate: '356deg' }] },
                                room.id === 'room-24' && { transform: [{ rotate: '40deg' }] },
                                room.id === 'hall-right' && { transform: [{ rotate: '40deg' }] },
                                Platform.OS === 'web' && !emergencyMode && { cursor: 'pointer' } as any,
                                Platform.OS === 'web' && emergencyMode && { cursor: 'not-allowed' } as any,
                            ]}
                            onPress={() => handleRoomPress(room)}
                            disabled={emergencyMode}
                        >
                            <Text style={[
                                styles.roomLabel,
                                room.type === 'stairwell' && styles.stairwellLabel,
                                room.type === 'hall' && styles.hallLabel,
                                isHighlighted && styles.roomLabelHighlighted,
                                isStairSelected && styles.stairwellLabelSelected,
                                isEmergency && styles.roomLabelEmergency,
                            ]} numberOfLines={1} adjustsFontSizeToFit>
                                {room.name}
                            </Text>
                            <Text style={styles.placeholderSubtext}>
                                Add {currentFloor === 2 ? 'secondFloorView.png' : 'thirdFloorView.png'} to assets/
                            </Text>
                        </View>
                    )}

                    {/* 2D Grid Overlay */}
                    {renderGrid()}

                    {/* Clickable room overlays */}
                    {currentRooms.map(room => {
                        const isHighlighted = highlightedRooms.includes(room.id);
                        const isStairSelected = isStairwellSelected(room);
                        const isEmergency = isEmergencyRoom(room);
                        return (
                            <Pressable
                                key={room.id}
                                style={({ pressed }) => [
                                    styles.roomOverlay,
                                    room.type === 'stairwell' && styles.stairwellOverlay,
                                    room.type === 'hall' && styles.hallOverlay,
                                    isHighlighted && styles.roomHighlighted,
                                    isStairSelected && styles.stairwellSelected,
                                    isEmergency && styles.roomEmergency,
                                    emergencyMode && styles.roomDisabled,
                                    getRoomStyle(room),
                                    pressed && !emergencyMode && styles.roomPressed,
                                    room.id === 'room-10' && { transform: [{ rotate: '348deg' }] },
                                    room.id === 'room-9' && { transform: [{ rotate: '348deg' }] },
                                    room.id === 'hall-center' && { transform: [{ rotate: '348deg' }] },
                                    room.id === 'hall-main-3a' && { /* add transform if needed */ },
                                    room.id === 'hall-main-3b' && { /* add transform if needed */ },
                                    room.id === 'hall-main-3c' && { /* add transform if needed */ },
                                    room.id === 'hall-side-3' && { /* add transform if needed */ },
                                    room.id === 'room-16' && { transform: [{ rotate: '40deg' }] },
                                    room.id === 'room-17' && { transform: [{ rotate: '40deg' }] },
                                    room.id === 'room-18' && { transform: [{ rotate: '40deg' }] },
                                    room.id === 'room-19' && { transform: [{ rotate: '40deg' }] },
                                    room.id === 'room-20' && { transform: [{ rotate: '40deg' }] },
                                    room.id === 'room-21' && { transform: [{ rotate: '40deg' }] },
                                    room.id === 'stair-C-1' && { transform: [{ rotate: '356deg' }] },
                                    room.id === 'room-24' && { transform: [{ rotate: '40deg' }] },
                                    room.id === 'hall-right' && { transform: [{ rotate: '40deg' }] },
                                    Platform.OS === 'web' && !emergencyMode && { cursor: 'pointer' } as any,
                                    Platform.OS === 'web' && emergencyMode && { cursor: 'not-allowed' } as any,
                                ]}
                                onPress={() => handleRoomPress(room)}
                                disabled={emergencyMode}
                            >
                                <Text style={[
                                    styles.roomLabel,
                                    room.type === 'stairwell' && styles.stairwellLabel,
                                    room.type === 'hall' && styles.hallLabel,
                                    isHighlighted && styles.roomLabelHighlighted,
                                    isStairSelected && styles.stairwellLabelSelected,
                                    isEmergency && styles.roomLabelEmergency,
                                ]} numberOfLines={1} adjustsFontSizeToFit>
                                    {room.name}
                                </Text>
                            </Pressable>
                        );
                    })}

                    {/* Escape Path Placeholder - TODO: Implement actual path rendering */}
                    {emergencyMode && escapePath.length > 0 && (
                        <View style={styles.escapePathOverlay} pointerEvents="none">
                            <Text style={styles.escapePathText}>Escape route will be displayed here</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#2196f3',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    arrowButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
    },
    arrowText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    floorLabel: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    mapContainer: {
        position: 'relative',
        width: '100%',
        minHeight: 200,
        backgroundColor: '#e0e0e0',
    },
    mapImage: {
        width: '100%',
        height: '100%',
    },
    placeholderMap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ddd',
    },
    placeholderText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    placeholderSubtext: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    roomOverlay: {
        position: 'absolute',
        backgroundColor: 'rgba(33, 150, 243, 0.25)',
        borderWidth: 1,
        borderColor: 'rgba(33, 150, 243, 0.5)',
        borderRadius: 2,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    roomPressed: {
        opacity: 0.7,
        backgroundColor: 'rgba(33, 150, 243, 0.5)',
    },
    hallOverlay: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderColor: 'rgba(76, 175, 80, 0.5)',
    },
    stairwellOverlay: {
        backgroundColor: 'rgba(244, 67, 54, 0.4)',
        borderColor: '#f44336',
        borderWidth: 2,
    },
    stairwellSelected: {
        backgroundColor: 'rgba(244, 67, 54, 0.7)',
        borderColor: '#b71c1c',
        borderWidth: 3,
    },
    roomHighlighted: {
        backgroundColor: 'rgba(255, 152, 0, 0.5)',
        borderColor: '#ff9800',
        borderWidth: 2,
    },
    roomLabel: {
        color: '#1565c0',
        fontSize: 8,
        fontWeight: 'bold',
        textAlign: 'center',
        backgroundColor: 'rgba(255,255,255,0.85)',
        paddingHorizontal: 2,
        paddingVertical: 1,
        borderRadius: 2,
    },
    hallLabel: {
        color: '#2e7d32',
        fontSize: 7,
    },
    stairwellLabel: {
        color: '#c62828',
        fontSize: 7,
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    stairwellLabelSelected: {
        color: '#fff',
        backgroundColor: 'rgba(183, 28, 28, 0.9)',
    },
    roomLabelHighlighted: {
        color: '#e65100',
        backgroundColor: 'rgba(255,255,255,0.95)',
    },
    gridToggleContainer: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 'auto',
    },
    gridToggleButton: {
        padding: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    gridToggleButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderColor: 'rgba(255,255,255,0.6)',
    },
    gridToggleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Emergency mode styles
    emergencyBanner: {
        backgroundColor: '#d32f2f',
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    emergencyBannerText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    headerEmergency: {
        backgroundColor: '#b71c1c',
    },
    roomEmergency: {
        backgroundColor: 'rgba(211, 47, 47, 0.7)',
        borderColor: '#d32f2f',
        borderWidth: 3,
    },
    roomLabelEmergency: {
        color: '#fff',
        backgroundColor: 'rgba(211, 47, 47, 0.9)',
        fontWeight: 'bold',
    },
    roomDisabled: {
        opacity: 0.7,
    },
    escapePathOverlay: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        backgroundColor: 'rgba(76, 175, 80, 0.9)',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    escapePathText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
