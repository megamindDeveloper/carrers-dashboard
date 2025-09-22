import { db } from '@/app/utils/firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import type { Candidate } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Video, Briefcase, GraduationCap, MapPin, Building, Calendar } from 'lucide-react';
import Image from 'next/image';
import mmLogo from '../../../../../.idx/mmLogo.png';

async function getCandidateData(id: string): Promise<Candidate | null> {
  const docRef = doc(db, 'applications', id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Candidate;
  } else {
    return null;
  }
}

export default async function SharedCandidatePage({ params }: { params: { id: string } }) {
  const candidate = await getCandidateData(params.id);

  if (!candidate) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-muted/40">
        <Card>
            <CardHeader>
                <CardTitle>Candidate Not Found</CardTitle>
            </CardHeader>
            <CardContent>
                <p>The candidate profile you are looking for does not exist or has been removed.</p>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  const displayLocation = candidate.city && candidate.state ? `${candidate.city}, ${candidate.state}` : candidate.location;

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
            <Image height={30} width={150} src={mmLogo} alt="MegaMind Careers Logo" />
            <div className="text-right">
                <h1 className="text-2xl font-bold text-primary">Candidate Profile</h1>
                <p className="text-muted-foreground">Shared via MegaMind Careers</p>
            </div>
        </div>

        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-background p-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="relative h-24 w-24 flex-shrink-0">
                    <Image
                        src={candidate.avatar}
                        alt={candidate.fullName}
                        layout="fill"
                        className="rounded-full object-cover"
                    />
                </div>
                <div className="flex-grow">
                    <CardTitle className="text-3xl font-bold">{candidate.fullName}</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">{candidate.position}</CardDescription>
                    <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="flex items-center gap-2">
                           {candidate.type === 'internship' ? <GraduationCap className="h-4 w-4" /> : <Briefcase className="h-4 w-4" />}
                           <span className="capitalize">{candidate.type}</span>
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-2">
                           <MapPin className="h-4 w-4" />
                           <span>{displayLocation}</span>
                        </Badge>
                    </div>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2"><Building className="h-5 w-5" /> Education</h3>
              <p className="text-muted-foreground">{candidate.education || 'N/A'}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary mb-2 flex items-center gap-2"><Calendar className="h-5 w-5" /> Experience</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{candidate.experience || candidate.workExperience || 'N/A'}</p>
            </div>
          </CardContent>
          <CardFooter className="bg-background p-6 flex flex-wrap items-center gap-4">
              {candidate.portfolio && (
                <Button variant="outline" asChild>
                  <a href={candidate.portfolio} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> View Portfolio
                  </a>
                </Button>
              )}
              {candidate.resumeUrl && (
                <Button variant="outline" asChild>
                  <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                    <FileText className="mr-2 h-4 w-4" /> View Resume
                  </a>
                </Button>
              )}
              {candidate.introductionVideoIntern && (
                <Button variant="outline" asChild>
                  <a href={candidate.introductionVideoIntern} target="_blank" rel="noopener noreferrer">
                    <Video className="mr-2 h-4 w-4" /> View Intro Video
                  </a>
                </Button>
              )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
