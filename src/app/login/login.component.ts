import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CognitoService } from 'src/cognito.service';
import { IUser } from 'src/model/user';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { HelperService } from '../service/helper.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  user: IUser = {} as IUser;

  constructor(private router: Router, private cognitoService: CognitoService, private helper: HelperService) {
    this.helper.helloWorld().subscribe({next: (res) => console.log(res)})
  }

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  });

  public login(): void {
    let form = this.loginForm.value;
    this.user.email = form.email!;
    this.user.password = form.password!;
    this.cognitoService.login(this.user).then(()=>{
      this.router.navigate(['/']);
    }).catch((error)=>{
      alert(error);
    })
  }
}
