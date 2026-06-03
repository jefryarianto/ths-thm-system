'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchFormProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  defaultValue?: string;
}

const SearchForm = ({ placeholder = 'Cari...', onSearch, defaultValue = '' }: SearchFormProps) => {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
      >
        Cari
      </button>
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          Reset
        </button>
      )}
    </form>
  );
};

export default SearchForm;