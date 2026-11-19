import AddStudent from '../admin/AddStudent';

// Reuse the central school admission component with campus context
const FranchiseAddStudent = () => {
  return <AddStudent isFranchise={true} />;
};

export default FranchiseAddStudent;
