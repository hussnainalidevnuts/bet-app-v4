'use client';
import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown, Calendar, DollarSign, Users, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Generate more mock data for better pagination demonstration
const generateMockBets = (count) => {
  const statuses = ['Pending', 'Won', 'Lost'];
  const users = ['John Doe', 'Jane Smith', 'Bob Lee', 'Alice Kim', 'Tom Clark', 'Sarah Johnson', 'Mike Wilson'];
  const events = [
    'Match A vs B', 'Match C vs D', 'Match E vs F', 'Match G vs H', 'Match I vs J',
    'Tournament Finals', 'Championship Series', 'League Playoffs', 'World Cup Qualifiers'
  ];
  
  const bets = [];
  for (let i = 1; i <= count; i++) {
    const id = `B${1000 + i}`;
    const user = users[Math.floor(Math.random() * users.length)];
    const amount = Math.floor(Math.random() * 500) + 10;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const event = events[Math.floor(Math.random() * events.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 14));
    const placedAt = date.toISOString().slice(0, 10) + ' ' + 
                   String(Math.floor(Math.random() * 24)).padStart(2, '0') + ':' + 
                   String(Math.floor(Math.random() * 60)).padStart(2, '0');
    
    bets.push({ id, user, amount, status, event, placedAt });
  }
  return bets;
};

const mockBets = generateMockBets(35);

const mockStats = {
  totalBets: mockBets.length,
  pending: mockBets.filter(bet => bet.status === 'Pending').length,
  won: mockBets.filter(bet => bet.status === 'Won').length,
  lost: mockBets.filter(bet => bet.status === 'Lost').length,
};

export default function BetManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [sortColumn, setSortColumn] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredBets = useMemo(() => {
    return mockBets.filter(bet => {
      // Filter by status
      if (filter !== 'all' && bet.status.toLowerCase() !== filter.toLowerCase()) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return bet.id.toLowerCase().includes(query) || 
              bet.user.toLowerCase().includes(query) || 
              bet.event.toLowerCase().includes(query);
      }
      
      return true;
    });
  }, [filter, searchQuery]);

  const sortedBets = useMemo(() => {
    return [...filteredBets].sort((a, b) => {
      const factor = sortDirection === 'asc' ? 1 : -1;
      
      if (sortColumn === 'amount') {
        return (a.amount - b.amount) * factor;
      }
      
      if (sortColumn === 'placedAt') {
        return new Date(a.placedAt) - new Date(b.placedAt) * factor;
      }
      
      const valueA = a[sortColumn]?.toString().toLowerCase() || '';
      const valueB = b[sortColumn]?.toString().toLowerCase() || '';
      
      return valueA.localeCompare(valueB) * factor;
    });
  }, [filteredBets, sortColumn, sortDirection]);

  const paginatedBets = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedBets.slice(start, end);
  }, [sortedBets, page, pageSize]);

  const totalPages = Math.ceil(sortedBets.length / pageSize);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'won': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'lost': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const SortableHeader = ({ column, label }) => (
    <TableHead className="font-medium py-4 px-6" onClick={() => handleSort(column)}>
      <div className="flex items-center cursor-pointer gap-1">
        {label}
        {sortColumn === column ? (
          <ArrowUpDown className="h-4 w-4" />
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-20" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-4 md:mb-0">Bet Management</h1>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search bets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 h-10 rounded-lg border-gray-200 bg-white shadow-sm"
              />
            </div>
          </div>
        </header>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-start">
                <div className="p-5 flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Bets</p>
                  <p className="text-2xl font-bold text-gray-900">{mockStats.totalBets}</p>
                </div>
                <div className="bg-blue-50 p-5">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-start">
                <div className="p-5 flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-amber-500">{mockStats.pending}</p>
                </div>
                <div className="bg-amber-50 p-5">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-start">
                <div className="p-5 flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">Won</p>
                  <p className="text-2xl font-bold text-emerald-500">{mockStats.won}</p>
                </div>
                <div className="bg-emerald-50 p-5">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-xl shadow-sm border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-start">
                <div className="p-5 flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">Lost</p>
                  <p className="text-2xl font-bold text-rose-500">{mockStats.lost}</p>
                </div>
                <div className="bg-rose-50 p-5">
                  <Users className="h-5 w-5 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for filtering */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
          <Tabs defaultValue="all" value={filter} onValueChange={setFilter} className="w-full">
            <TabsList className="grid grid-cols-4 h-10 p-1 bg-gray-100 rounded-lg">
              <TabsTrigger value="all" className="rounded-md text-sm font-medium">
                All
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-md text-sm font-medium">
                Pending
              </TabsTrigger>
              <TabsTrigger value="won" className="rounded-md text-sm font-medium">
                Won
              </TabsTrigger>
              <TabsTrigger value="lost" className="rounded-md text-sm font-medium">
                Lost
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border-l-4 border-red-500 mb-6">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 border-l-4 border-green-500 mb-6">
            {message}
          </div>
        )}

        {/* Bets Table */}
        <Card className="shadow-sm border-0 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <SortableHeader column="id" label="Bet ID" />
                  <SortableHeader column="user" label="User" />
                  <TableHead className="font-medium py-4 px-6">Event</TableHead>
                  <SortableHeader column="amount" label="Amount" />
                  <SortableHeader column="status" label="Status" />
                  <SortableHeader column="placedAt" label="Placed At" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="h-8 w-8 text-gray-300 mb-2" />
                        <p>No bets found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filter</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedBets.map((bet) => (
                    <TableRow key={bet.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <TableCell className="font-medium py-4 px-6">{bet.id}</TableCell>
                      <TableCell className="py-4 px-6">{bet.user}</TableCell>
                      <TableCell className="py-4 px-6 max-w-[200px] truncate">{bet.event}</TableCell>
                      <TableCell className="py-4 px-6 font-medium">${bet.amount}</TableCell>
                      <TableCell className="py-4 px-6">
                        <Badge variant="outline" className={getStatusColor(bet.status)}>
                          {bet.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-6 text-gray-500 text-sm">{bet.placedAt}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {sortedBets.length > 0 && (
            <CardFooter className="flex items-center justify-between p-4 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{" "}
                <span className="font-medium">{Math.min(page * pageSize, sortedBets.length)}</span> of{" "}
                <span className="font-medium">{sortedBets.length}</span> bets
              </div>
              <div className="flex items-center space-x-2">
                <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center">
                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={i}
                          variant={page === pageNum ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8 mx-0.5"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
} 