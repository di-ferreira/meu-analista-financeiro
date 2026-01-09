import { Dashboard } from '@/components/Dashboard';
import { UploadForm } from '@/components/UploadForm';

export default function Home() {
  return (
    <main className='flex min-h-screen flex-col items-center p-12 bg-slate-50'>
      <div className='w-full max-w-5xl'>
        <h1 className='text-4xl font-extrabold text-center mb-12 text-slate-900'>
          Finance<span className='text-blue-600'>AI</span>
          <span className='text-sm font-normal text-slate-400 block mt-2'>
            Sua gestão turbinada com
            <strong className='font-black'> IA </strong>
          </span>
        </h1>

        <div className='grid grid-cols-1 gap-8'>
          <UploadForm />
          <Dashboard />
        </div>
      </div>
    </main>
  );
}

