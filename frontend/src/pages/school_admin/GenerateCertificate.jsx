import GenerateCertificate from '../admin/GenerateCertificate';

// School admin can generate certificates for their students only
const FranchiseGenerateCertificate = () => {
  return <GenerateCertificate franchiseMode={true} />;
};

export default FranchiseGenerateCertificate;
