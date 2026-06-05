import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import DataTable from '../../components/ui/DataTable';

interface TestItem { id: number; name: string; status: string; }

const columns = [
  { key: 'name' as keyof TestItem, title: 'Name' },
  { key: 'status' as keyof TestItem, title: 'Status' },
];

const sampleData: TestItem[] = [
  { id: 1, name: 'Item One', status: 'active' },
  { id: 2, name: 'Item Two', status: 'inactive' },
  { id: 3, name: 'Item Three', status: 'active' },
];

describe('DataTable Component', () => {
  it('renders table headers', () => {
    const { getByText } = render(<DataTable columns={columns} data={[]} />);
    expect(getByText('NAME')).toBeTruthy();
    expect(getByText('STATUS')).toBeTruthy();
  });

  it('renders data rows', () => {
    const { getByText } = render(<DataTable columns={columns} data={sampleData} />);
    expect(getByText('Item One')).toBeTruthy();
    expect(getByText('Item Two')).toBeTruthy();
    expect(getByText('Item Three')).toBeTruthy();
  });

  it('shows no records message when empty', () => {
    const { getByText } = render(<DataTable columns={columns} data={[]} />);
    expect(getByText('No records found')).toBeTruthy();
  });

  it('shows loading skeleton when loading=true', () => {
    const { container } = render(<DataTable columns={columns} data={[]} loading={true} />);
    const pulses = container.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBeGreaterThan(0);
  });

  it('renders record count', () => {
    const { getByText } = render(<DataTable columns={columns} data={sampleData} />);
    expect(getByText('3 records')).toBeTruthy();
  });

  it('calls onAdd when add button clicked', () => {
    const onAdd = jest.fn();
    const { getByText } = render(<DataTable columns={columns} data={[]} onAdd={onAdd} addLabel="Add Item" />);
    fireEvent.click(getByText('Add Item'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onExport when export button clicked', () => {
    const onExport = jest.fn();
    const { getByText } = render(<DataTable columns={columns} data={[]} onExport={onExport} />);
    fireEvent.click(getByText(/Export/i));
    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('calls onSearch when typing in search', () => {
    const onSearch = jest.fn();
    const { getByPlaceholderText } = render(<DataTable columns={columns} data={sampleData} onSearch={onSearch} searchPlaceholder="Search..." />);
    const input = getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(onSearch).toHaveBeenCalledWith('test');
  });

  it('renders custom cell renderer', () => {
    const customColumns = [
      { key: 'name' as keyof TestItem, title: 'Name' },
      { key: 'status' as keyof TestItem, title: 'Status', render: (row: TestItem) => <span data-testid="custom">{row.status.toUpperCase()}</span> },
    ];
    const { container } = render(<DataTable columns={customColumns} data={[{ id: 1, name: 'X', status: 'active' }]} />);
    const customEl = container.querySelector('[data-testid="custom"]');
    expect(customEl?.textContent).toBe('ACTIVE');
  });

  it('renders action column', () => {
    const actions = (row: TestItem) => <button>Edit {row.name}</button>;
    const { getAllByText } = render(<DataTable columns={columns} data={sampleData} actions={actions} />);
    expect(getAllByText(/Edit/).length).toBe(3);
  });

  it('renders title when provided', () => {
    const { getByText } = render(<DataTable columns={columns} data={[]} title="My Table" />);
    expect(getByText('My Table')).toBeTruthy();
  });

  it('renders 0 records when empty', () => {
    const { getByText } = render(<DataTable columns={columns} data={[]} />);
    expect(getByText('0 records')).toBeTruthy();
  });
});
