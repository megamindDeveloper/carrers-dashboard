
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Job } from '@/lib/types';
import { JobCard } from '@/components/careers/job-card';

export default function CareersPage() {
  const [selectedPosition, setSelectedPosition] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/jobs?status=Open');
        if (!response.ok) {
          throw new Error('Failed to fetch jobs');
        }
        const result = await response.json();

        if (result.success) {
          setJobs(result.data);
        } else {
          setError(result.message);
        }
      } catch (err: any) {
        setError(err.message || 'Could not fetch data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleViewMore = (position: Job) => {
    setSelectedPosition(position);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPosition(null);
  };

  const fullTimeJobs = jobs.filter(
    job => job.type === 'full-time' && job.status === 'Open'
  );
  const internshipJobs = jobs.filter(
    job => job.type === 'internship' && job.status === 'Open'
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <>
      <section id="full-time" className="py-12 md:pb-22 md:pt-[8rem] bg-background">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold">Current Openings</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Explore exciting career opportunities for experienced professionals.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {fullTimeJobs.map(job => (
              <JobCard key={job.id} job={job} onVewMore={() => handleViewMore(job)} />
            ))}
          </div>
        </div>
      </section>

      <section id="intern" className="py-20 md:py-22 bg-background">
        <div className="container mt-12">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold">Internship Opportunities</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Find your passion and kickstart your career with us. We have openings in various fields.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {internshipJobs.map(job => (
              <JobCard key={job.id} job={job} onVewMore={() => handleViewMore(job)} />
            ))}
          </div>
        </div>
      </section>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto hide-scrollbar md:p-10 p-7">
          {selectedPosition && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold mb-2">
                  {selectedPosition.position}
                </DialogTitle>
                <div className="flex flex-wrap gap-3 mb-6">
                    {selectedPosition.highlightPoints?.map((point, index) => (
                         <span
                            key={index}
                            className="bg-red-500 text-white text-xs px-3 py-1 rounded-2xl"
                            dangerouslySetInnerHTML={{ __html: point }}
                         />
                    ))}
                 
                  {selectedPosition.type === 'full-time' && selectedPosition.experience && (
                    <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-2xl">
                      {selectedPosition.experience} Exp
                    </span>
                  )}
                </div>
                 <div>
                  <h3 className="text-md font-semibold mb-2 mt-3">
                    Location: <span className="text-sm text-muted-foreground">{selectedPosition.location}</span>
                  </h3>
                </div>
                 <DialogDescription className="text-lg text-black ">
                    <h3 className="text-lg font-semibold mb-3 mt-1">About Megamind</h3>
                    <p className="text-sm text-muted-foreground">Megamind is a leading Creative Agency based in Mangalore, India, specializing in
                    end-to-end digital marketing services, brand development, corporate film production, and
                    web and graphic design solutions. Our diverse client base includes both startups and
                    established businesses across various industries. We are committed to delivering creative,
                    customer-centric solutions that foster business growth and visibility. At Megamind, we aim to
                    create a dynamic work environment that promotes positive employee engagement,
                    professional growth, and collaborative success</p>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                 {selectedPosition.sections?.map(section => (
                    section.points && section.points.length > 0 && section.points[0] && (
                        <div key={section.title}>
                        <h3 className="text-lg font-semibold mb-3">{section.title}</h3>
                        <ul className="space-y-2">
                            {section.points.map((item, index) => (
                            <li key={index} className="flex items-start">
                                <div className="text-sm text-muted-foreground prose" dangerouslySetInnerHTML={{ __html: item }}></div>
                            </li>
                            ))}
                        </ul>
                        </div>
                    )
                 ))}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPosition.duration && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Duration</h3>
                      <p className="text-sm text-muted-foreground">{selectedPosition.duration}</p>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Why Megamind?</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span className="text-sm text-muted-foreground">
                        Work with a dynamic and collaborative team in a creative work environment.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span className="text-sm text-muted-foreground">
                        Opportunities for professional growth and continuous learning.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span className="text-sm text-muted-foreground">
                        Involvement in innovative projects with renowned brands and businesses.
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary mr-2">•</span>
                      <span className="text-sm text-muted-foreground">
                        Positive workplace culture with regular employee engagement activities.
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="pt-6 border-t">
                  <Button asChild className="w-full md:w-auto rounded-full font-semibold" size="lg">
                    <Link href={`/apply/${encodeURIComponent(selectedPosition.position)}`}>
                      Apply Now
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
