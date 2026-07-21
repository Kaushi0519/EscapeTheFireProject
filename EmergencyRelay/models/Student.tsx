// Student structure containing, name, image, and checkbox for marking attendance
export default interface Student {
  id: string;
  name: string;
  imageUri: string;
  isPresent: boolean;
}