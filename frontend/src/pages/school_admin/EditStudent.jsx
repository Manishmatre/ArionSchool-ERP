import EditStudent from '../admin/EditStudent';

// Reuse the central school student editing component with campus context
const FranchiseEditStudent = () => {
  return <EditStudent isFranchise={true} />;
};

export default FranchiseEditStudent;
