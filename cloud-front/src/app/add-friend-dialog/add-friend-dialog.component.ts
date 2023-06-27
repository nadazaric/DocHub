import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FileService } from '../service/file.service';
import { Router } from '@angular/router';
import { CognitoService } from '../service/cognito.service';

@Component({
  selector: 'app-add-friend-dialog',
  templateUrl: './add-friend-dialog.component.html',
  styleUrls: ['./add-friend-dialog.component.css']
})
export class AddFriendDialogComponent {


  fileForm = new FormGroup({
    email: new FormControl('', Validators.required)
  })

  constructor(public dialogRef: MatDialogRef<AddFriendDialogComponent>, private fileService: FileService, private router: Router, private cognitoService: CognitoService) {}

  async sendFriendRequest() {
    const email = localStorage.getItem("email");
    const invite = this.fileForm.value.email;
    if(!this.fileForm.valid){
      alert("Email value is required!");
      return;
    }
    if (email == null) {
      this.cancel();
      this.router.navigate(['login']);
      return;
    }

    if(email != null && email == invite!)
    {
      this.cancel();
      alert("You cannot send an invitation to yourself");
      return;
    }

    this.fileService.shareRepositoryInvitation(email!, invite!).subscribe(
      (res) => {
        console.log(res);
        this.dialogRef.close();
        alert("Request successfully sent");
      }, (error) => {
        console.log(error);
        if(error.status == 0){
          alert("Unknown error occured");
        }else if(error.status == 500 || error.status == 400){
          alert(error.error.message);
          this.cancel();
        }
      }
    )
  }

  cancel() {
    this.dialogRef.close();
  }

}
