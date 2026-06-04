/*
 File: user-registration.component.ts
 Description: User account registration and management page
 Purpose: Allows admins to create, update, and delete standard user accounts.
 Features: Form validation, user listing, role assignment, page access control
*/

// src/app/components/pages/admin/user-registration/user-registration.component.ts
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../../environments/environment';
import { CreateUserDto, UpdateUserDto, User, UserService } from '../../../../services/user.service';

/* ========== USER REGISTRATION COMPONENT ========== */

@Component({
  selector: 'app-user-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './user-registration.component.html',
  styleUrls: ['./user-registration.component.scss']
})
export class UserRegistrationComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  pageTitle = 'User Registration';
  @ViewChild('formCard') formCard?: ElementRef<HTMLElement>;
  @ViewChild('nameField') nameField?: ElementRef<HTMLInputElement>;

  formData: CreateUserDto = {
    serviceId: '',
    name: '',
    pages: [],
    role: 'User', // Default to User
    isActive: true
  };

  users: User[] = [];
  error = '';
  success = '';
  editingUser: User | null = null;
  isLoading = false;

  availablePages = [
    'SERVICE FULFILMENT',
    'IP NW OP',
    'BB ANW',
    'OTN OP',
    'Tower Maintenance',
    'Tower Maintenance KPI',
    'Other KPI',
    'ROUTINE MTNC',
    'TOWER MTCE ACHIEVEMENT',
    'Enterprise KPI'
  ];

  constructor(private userService: UserService) { }

  ngOnInit() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.isLoading = true;
    this.userService.getAllUsers().subscribe({
      next: (users: User[]) => {
        this.users = users;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.error = 'Failed to fetch users. Please check if backend is running.';
        console.error('Error fetching users:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  handlePageChange(page: string) {
    // For PlatformAdmin enforce single selection; for others allow multi
    if (this.formData.role === 'PlatformAdmin') {
      this.formData.pages = [page];
    } else {
      const index = this.formData.pages.indexOf(page);
      if (index > -1) {
        this.formData.pages.splice(index, 1);
      } else {
        this.formData.pages.push(page);
      }
    }
  }

  handleSubmit(event: Event) {
    event.preventDefault();
    this.error = '';
    this.success = '';

    if (!this.formData.name.trim()) {
      this.error = 'Name is required';
      return;
    }

    if (!this.formData.serviceId.trim()) {
      this.error = 'Service ID is required';
      return;
    }

    this.isLoading = true;

    if (this.editingUser) {
      const updateData: UpdateUserDto = {
        serviceId: this.formData.serviceId,
        name: this.formData.name,
        role: this.formData.role,
        isActive: this.formData.isActive,
        pages: this.formData.pages
      };

      // Ensure we use userId (number) for update
      this.userService.updateUser(this.editingUser.userId.toString(), updateData).subscribe({
        next: () => {
          this.success = 'User updated successfully';
          this.fetchUsers();
          this.resetForm();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.error = 'Failed to update user: ' + error.message;
          console.error('Update error:', error);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
      this.userService.createUser(this.formData).subscribe({
        next: (newUser: User) => {
          this.success = 'User created successfully';
          this.users.push(newUser);
          this.resetForm();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.error = 'Failed to create user: ' + error.message;
          console.error('Create error:', error);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  handleEdit(user: User) {
    this.editingUser = user;
    this.formData = {
      serviceId: user.serviceId,
      name: user.name,
      pages: [...user.pages],
      role: user.role,
      isActive: user.isActive
    };

    // Enforce single selection UI for PlatformAdmin
    if (this.formData.role === 'PlatformAdmin' && this.formData.pages.length > 1) {
      this.formData.pages = [this.formData.pages[0]];
    }

    setTimeout(() => {
      this.formCard?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.nameField?.nativeElement.focus();
    }, 50);
  }

  handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    this.isLoading = true;
    this.userService.deleteUser(id.toString()).subscribe({
      next: () => {
        this.success = 'User deleted successfully';
        this.users = this.users.filter(u => u.userId !== id);
        if (this.editingUser && this.editingUser.userId === id) {
          this.cancelEdit();
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.error = 'Failed to delete user: ' + error.message;
        console.error('Delete error:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  cancelEdit() {
    this.editingUser = null;
    this.resetForm();
  }

  private resetForm() {
    this.formData = {
      serviceId: '',
      name: '',
      pages: [],
      role: 'User',
      isActive: true
    };
    this.editingUser = null;
  }

  fillBasicTestData() {
    this.formData.name = 'Test User';
    this.formData.serviceId = (10000 + this.users.length).toString();
    this.formData.pages = this.availablePages.length ? [this.availablePages[0]] : [];
  }

  selectAllPages() {
    this.formData.pages = [...this.availablePages];
  }

  clearPages() {
    this.formData.pages = [];
  }

  testBackendConnection() {
    this.error = '';
    this.success = 'Testing backend connection...';
    fetch(`${environment.apiUrl}/users`)
      .then(response => {
        if (response.ok) {
          this.success = 'Backend connection successful!';
        } else {
          this.error = `Backend returned status: ${response.status}`;
        }
      })
      .catch(err => {
        this.error = 'Cannot connect to backend. Make sure the local API is running.';
        console.error('Connection test failed:', err);
      });
  }
}
