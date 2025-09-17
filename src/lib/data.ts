import type { Candidate } from './types';

export const initialCandidates: Candidate[] = [
  {
    id: 'CAND-001',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    contactNumber: '+1234567890',
    location: 'San Francisco',
    address: '123 Main St, Anytown, USA',
    education: 'B.S. in Computer Science, University of Example, 2024',
    workExperience:
      'Frontend Developer Intern at TechCorp. Worked on responsive web design and React components.',
    position: 'Graphic Designer Intern',
    portfolio: 'https://example.com/johndoe',
    resumeUrl:
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    avatar: 'https://i.pravatar.cc/150?u=john.doe@example.com',
  },
  {
    id: 'CAND-002',
    fullName: 'Jane Smith',
    email: 'jane.smith@example.com',
    contactNumber: '+1987654321',
    location: 'New York',
    address: '456 Oak Ave, Othertown, USA',
    education: 'M.A. in UX Design, Design Institute, 2023',
    workExperience: 'UI/UX Designer at CreativeMinds. Led user research and created wireframes.',
    position: 'UX Researcher',
    portfolio: 'https://example.com/janesmith',
    resumeUrl:
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    avatar: 'https://i.pravatar.cc/150?u=jane.smith@example.com',
  },
  {
    id: 'CAND-003',
    fullName: 'Michael Johnson',
    email: 'michael.johnson@example.com',
    contactNumber: '+1122334455',
    location: 'Chicago',
    address: '789 Pine Ln, Anycity, USA',
    education: 'B.A. in Marketing, State University, 2023',
    workExperience: 'Marketing intern at AdCo, managed social media campaigns.',
    position: 'Marketing Associate',
    portfolio: 'https://example.com/michaeljohnson',
    resumeUrl:
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    avatar: 'https://i.pravatar.cc/150?u=michael.johnson@example.com',
  },
  {
    id: 'CAND-004',
    fullName: 'Emily Davis',
    email: 'emily.davis@example.com',
    contactNumber: '+1555666777',
    location: 'Austin',
    address: '101 Maple Rd, Yourtown, USA',
    education: 'B.S. in Software Engineering, Tech University, 2024',
    workExperience: 'Backend developer intern at Innovate Inc., worked with Node.js and databases.',
    position: 'Software Engineer',
    portfolio: 'https://github.com/emilydavis',
    resumeUrl:
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    avatar: 'https://i.pravatar.cc/150?u=emily.davis@example.com',
  },
];
